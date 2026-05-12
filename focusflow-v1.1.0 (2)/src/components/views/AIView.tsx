'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Send,
  Trash2,
  CalendarDays,
  BookOpen,
  AlertTriangle,
  Heart,
  RotateCcw,
  Bot,
  User,
  Loader2,
  Zap,
  Paperclip,
  Download,
  FileText,
  Presentation,
  X,
  Image as ImageIcon,
  CheckCircle2,
  File,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useAppStore,
  type ChatMessage,
  type ChatAttachment,
  type GeneratedFile,
  type AIAction,
} from '@/lib/store'

// ─── Quick Prompt Definitions ─────────────────────────────────────────────────

const QUICK_PROMPTS = [
  {
    id: 'organize',
    label: 'Organize my day',
    icon: CalendarDays,
    message:
      'Can you help me organize my tasks for today? Prioritize them and suggest the best order.',
    color: 'bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/60',
  },
  {
    id: 'study-plan',
    label: 'Study plan',
    icon: BookOpen,
    message:
      'Create an optimal study schedule for me today based on my subjects and their progress.',
    color: 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/60',
  },
  {
    id: 'overload',
    label: 'Am I overloaded?',
    icon: AlertTriangle,
    message:
      'Look at my tasks and schedule. Am I taking on too much? What should I delegate or postpone?',
    color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60',
  },
  {
    id: 'motivate',
    label: 'Motivate me',
    icon: Heart,
    message:
      'I need some motivation. Give me a short, powerful message to keep going.',
    color: 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/60',
  },
]

// ─── Action Parsing Helpers ────────────────────────────────────────────────────

interface ParsedAction {
  type: string
  data: Record<string, unknown>
  raw: string
}

function parseActions(content: string): { text: string; actions: ParsedAction[] } {
  // Primary regex: [ACTION:type]json[/ACTION]
  const actionRegex = /\[ACTION:(\w+)\]([\s\S]*?)\[\/ACTION\]/g
  const actions: ParsedAction[] = []
  let match: RegExpExecArray | null

  while ((match = actionRegex.exec(content)) !== null) {
    const actionType = match[1]
    const rawBody = match[2].trim()
    let data: Record<string, unknown> = {}
    try {
      data = JSON.parse(rawBody)
    } catch {
      // Try to fix common JSON issues: unquoted values, trailing commas
      try {
        const fixed = rawBody
          .replace(/(\w+)\s*:/g, '"$1":') // unquoted keys
          .replace(/'([^']*)'/g, '"$1"') // single quotes
          .replace(/,\s*}/g, '}') // trailing comma
        data = JSON.parse(fixed)
      } catch {
        // Last resort: try to extract key fields manually
        const titleMatch = rawBody.match(/title[":\s]+([^",}\s]+)/i)
        const nameMatch = rawBody.match(/name[":\s]+([^",}\s]+)/i)
        data = {
          raw: rawBody,
          ...(titleMatch && { title: titleMatch[1] }),
          ...(nameMatch && { name: nameMatch[1] }),
        }
      }
    }
    actions.push({
      type: actionType,
      data,
      raw: match[0],
    })
  }

  // Also try to detect code-block wrapped actions (AI sometimes wraps in ```)
  const codeBlockRegex = /```[\s\S]*?\[ACTION:(\w+)\]([\s\S]*?)\[\/ACTION\][\s\S]*?```/g
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Avoid duplicates
    if (!actions.some(a => a.raw === match[0])) {
      const actionType = match[1]
      let data: Record<string, unknown> = {}
      try {
        data = JSON.parse(match[2].trim())
      } catch {
        data = { raw: match[2].trim() }
      }
      actions.push({ type: actionType, data, raw: match[0] })
    }
  }

  // Strip action blocks from display text
  let text = content
  // Remove code-block wrapped actions
  text = text.replace(codeBlockRegex, '')
  // Remove raw action blocks
  text = text.replace(actionRegex, '')
  // Clean up
  text = text.replace(/```[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim()

  return { text, actions }
}

// ─── Action Execution ──────────────────────────────────────────────────────────

function executeAction(
  action: ParsedAction,
  store: ReturnType<typeof useAppStore.getState>
): { success: boolean; label: string } {
  const { type, data } = action

  switch (type) {
    case 'add_task': {
      const today = new Date().toISOString().split('T')[0]
      store.addTask({
        title: (data.title as string) || 'Untitled Task',
        description: (data.description as string) || undefined,
        status: 'todo',
        priority: (data.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
        category: (data.category as 'study' | 'work' | 'personal') || 'study',
        dueDate: (data.dueDate as string) || today,
        dueTime: (data.dueTime as string) || undefined,
        completed: false,
        recurring: undefined,
        tags: undefined,
        parentId: undefined,
      })
      return { success: true, label: `Task added: ${data.title || 'Untitled Task'}` }
    }
    case 'complete_task': {
      const id = data.id as string
      if (id) {
        store.completeTask(id)
        return { success: true, label: `Task completed` }
      }
      return { success: false, label: 'Cannot complete task: missing ID' }
    }
    case 'delete_task': {
      const id = data.id as string
      if (id) {
        store.deleteTask(id)
        return { success: true, label: `Task deleted` }
      }
      return { success: false, label: 'Cannot delete task: missing ID' }
    }
    case 'add_time_block': {
      store.addTimeBlock({
        title: (data.title as string) || 'Untitled Block',
        startTime: (data.startTime as string) || '09:00',
        endTime: (data.endTime as string) || '10:00',
        category: (data.category as 'study' | 'work' | 'personal' | 'break') || 'study',
        date: (data.date as string) || new Date().toISOString().split('T')[0],
        completed: false,
      })
      return { success: true, label: `Time block added: ${data.title || 'Untitled Block'}` }
    }
    case 'add_habit': {
      store.addHabit({
        name: (data.name as string) || 'New Habit',
        color: (data.color as string) || '#7c3aed',
        frequency: (data.frequency as 'daily' | 'weekdays' | 'weekends' | 'custom') || 'daily',
        targetCount: (data.targetCount as number) || 1,
      })
      return { success: true, label: `Habit added: ${data.name || 'New Habit'}` }
    }
    case 'add_subject': {
      store.addSubject({
        name: (data.name as string) || 'New Subject',
        color: (data.color as string) || '#7c3aed',
        icon: (data.icon as string) || undefined,
      })
      return { success: true, label: `Subject added: ${data.name || 'New Subject'}` }
    }
    case 'add_topic': {
      const subjectId = data.subjectId as string
      const subjectName = data.subjectName as string
      if (subjectId) {
        store.addTopic(subjectId, {
          name: (data.topicName as string) || (data.name as string) || 'New Topic',
          notes: (data.notes as string) || undefined,
        })
        return { success: true, label: `Topic added: ${data.topicName || data.name || 'New Topic'}` }
      } else if (subjectName) {
        // Find subject by name and add topic
        const state = store
        const subject = state.subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase())
        if (subject) {
          store.addTopic(subject.id, {
            name: (data.topicName as string) || (data.name as string) || 'New Topic',
            notes: (data.notes as string) || undefined,
          })
          return { success: true, label: `Topic added: ${data.topicName || data.name || 'New Topic'}` }
        }
        return { success: false, label: `Subject "${subjectName}" not found` }
      }
      return { success: false, label: 'Cannot add topic: missing subjectId or subjectName' }
    }
    case 'generate_file': {
      // File generation is handled on the frontend side via the message's generatedFiles
      return { success: true, label: `File generated: ${data.filename || 'download'}` }
    }
    default:
      return { success: false, label: `Unknown action: ${type}` }
  }
}

// ─── File Download Helper ──────────────────────────────────────────────────────

function downloadFile(file: GeneratedFile) {
  if (file.type === 'txt' || file.type === 'html') {
    const blob = new Blob([file.url], { type: file.type === 'html' ? 'text/html' : 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

function generateFileFromAction(action: ParsedAction): GeneratedFile | null {
  const { data } = action
  const fileType = (data.fileType as string) || 'txt'
  const filename = (data.filename as string) || `focusflow-export.${fileType}`
  // Get content from multiple possible fields the AI might use
  const content = (data.content as string) || (data.text as string) || (data.body as string) || (data.raw as string) || ''

  if (fileType === 'html' || filename.endsWith('.html')) {
    // Generate a simple HTML-based presentation
    const slides = content.split('---SLIDE---')
    if (slides.length > 1) {
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${filename}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f0f23; color: #e2e8f0; }
  .slide { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 4rem; border-bottom: 1px solid rgba(124,58,237,0.3); }
  .slide h1 { font-size: 3rem; background: linear-gradient(135deg, #7c3aed, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1rem; }
  .slide h2 { font-size: 2rem; color: #a78bfa; margin-bottom: 0.5rem; }
  .slide p, .slide li { font-size: 1.25rem; line-height: 1.8; color: #cbd5e1; }
  .slide ul { list-style: none; padding: 0; }
  .slide ul li::before { content: '→ '; color: #7c3aed; }
  .slide-number { position: fixed; bottom: 1rem; right: 1rem; color: #64748b; font-size: 0.875rem; }
</style>
</head>
<body>
${slides.map((slide, i) => `<div class="slide">${slide.trim()}</div>`).join('\n')}
</body>
</html>`
      return {
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        name: filename.endsWith('.html') ? filename : `${filename}.html`,
        type: 'html',
        url: htmlContent,
        size: htmlContent.length,
      }
    }
    // Single-page HTML
    if (content.trim()) {
      const htmlContent = content.includes('<html') || content.includes('<!DOCTYPE')
        ? content
        : `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${filename}</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.8; color: #1e293b; }
  h1, h2 { color: #7c3aed; }
  ul { padding-left: 1.5rem; }
  li { margin: 0.5rem 0; }
</style>
</head>
<body>
${content}
</body>
</html>`
      return {
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        name: filename.endsWith('.html') ? filename : `${filename}.html`,
        type: 'html',
        url: htmlContent,
        size: htmlContent.length,
      }
    }
  }

  // PPTX-style: generate HTML presentation from structured data
  if (fileType === 'pptx' || filename.endsWith('.pptx')) {
    const slideEntries = content.split(/\n{2,}/).filter(s => s.trim())
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${filename}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f0f23; color: #e2e8f0; }
  .slide { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 4rem; border-bottom: 1px solid rgba(124,58,237,0.3); page-break-after: always; }
  .slide h1 { font-size: 3rem; background: linear-gradient(135deg, #7c3aed, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1.5rem; text-align: center; }
  .slide h2 { font-size: 2rem; color: #a78bfa; margin-bottom: 1rem; text-align: center; }
  .slide p, .slide li { font-size: 1.25rem; line-height: 2; color: #cbd5e1; }
  .slide ul { list-style: none; padding: 0; }
  .slide ul li::before { content: '→ '; color: #7c3aed; font-weight: bold; }
  .slide ol { padding-left: 2rem; }
  .slide ol li { margin: 0.5rem 0; }
  @media print { .slide { min-height: auto; padding: 3rem; page-break-after: always; } }
</style>
</head>
<body>
${slideEntries.map((slide, i) => {
  const lines = slide.trim().split('\n')
  const title = lines[0]
  const body = lines.slice(1).join('\n')
  return `<div class="slide">
${title.startsWith('#') ? `<h1>${title.replace(/^#+\s*/, '')}</h1>` : `<h2>${title}</h2>`}
<div>${body.replace(/\n/g, '<br/>')}</div>
</div>`
}).join('\n')}
</body>
</html>`
    return {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      name: filename.replace('.pptx', '.html'),
      type: 'html',
      url: htmlContent,
      size: htmlContent.length,
    }
  }

  // Default: plain text file - make sure we have content
  const textContent = content.trim() || '(Empty document)'
  return {
    id: Math.random().toString(36).substring(2) + Date.now().toString(36),
    name: filename.endsWith('.txt') ? filename : `${filename}.txt`,
    type: 'txt',
    url: textContent,
    size: textContent.length,
  }
}

// ─── Helper: Build Context String ─────────────────────────────────────────────

function buildContext(
  tasks: ReturnType<typeof useAppStore.getState>['tasks'],
  subjects: ReturnType<typeof useAppStore.getState>['subjects'],
  habits: ReturnType<typeof useAppStore.getState>['habits'],
  studySessions: ReturnType<typeof useAppStore.getState>['studySessions'],
  timeBlocks: ReturnType<typeof useAppStore.getState>['timeBlocks'],
  settings: ReturnType<typeof useAppStore.getState>['settings']
): string {
  const today = new Date().toISOString().split('T')[0]
  const lines: string[] = []

  lines.push(`=== User Profile ===`)
  lines.push(`Name: ${settings.name}`)
  lines.push(`Level: ${settings.level}, XP: ${settings.xp}, Streak: ${settings.streak} days`)
  lines.push(
    `Pomodoro: ${settings.pomodoroWork}min work / ${settings.pomodoroBreak}min break / ${settings.pomodoroLongBreak}min long break / ${settings.pomodoroRounds} rounds`
  )
  lines.push('')

  // Tasks
  const todayTasks = tasks.filter((t) => t.dueDate === today)
  lines.push(`=== Today's Tasks (${todayTasks.length}) ===`)
  todayTasks.forEach((t) => {
    const status = t.completed ? '✓' : t.status === 'in-progress' ? '►' : '○'
    lines.push(
      `  ${status} [${t.priority}] ${t.title} (id: ${t.id})${t.description ? ` — ${t.description}` : ''} (${t.category})${t.dueTime ? ` due ${t.dueTime}` : ''}`
    )
  })
  const allIncomplete = tasks.filter((t) => !t.completed)
  if (allIncomplete.length > todayTasks.length) {
    lines.push(`  (+ ${allIncomplete.length - todayTasks.filter((t) => !t.completed).length} other incomplete tasks)`)
  }
  // Also include all task IDs for action reference
  if (tasks.length > 0) {
    lines.push(`  All task IDs: ${tasks.map(t => `${t.title}=${t.id}`).join(', ')}`)
  }
  lines.push('')

  // Subjects
  lines.push(`=== Subjects (${subjects.length}) ===`)
  subjects.forEach((s) => {
    lines.push(`  ${s.name}: ${s.progress}% progress, ${s.topics.length} topics`)
    s.topics.forEach((t) => {
      lines.push(`    - ${t.name}: ${t.progress}%${t.completed ? ' (completed)' : ''}`)
    })
  })
  lines.push('')

  // Habits
  const todayHabits = habits.filter((h) => {
    const dayOfWeek = new Date().getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    if (h.frequency === 'daily') return true
    if (h.frequency === 'weekdays') return !isWeekend
    if (h.frequency === 'weekends') return isWeekend
    return true
  })
  const completedHabits = todayHabits.filter((h) =>
    h.logs.some((l) => l.date === today && l.completed)
  )
  lines.push(`=== Today's Habits (${completedHabits.length}/${todayHabits.length} completed) ===`)
  todayHabits.forEach((h) => {
    const done = h.logs.some((l) => l.date === today && l.completed)
    lines.push(`  ${done ? '✓' : '○'} ${h.name} (${h.frequency})`)
  })
  lines.push('')

  // Recent Study Sessions
  const recentSessions = [...studySessions]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 3)
  lines.push(`=== Recent Study Sessions (last 3) ===`)
  recentSessions.forEach((s) => {
    lines.push(
      `  ${s.subjectName || 'Unknown'} — ${s.type} ${s.duration}min${s.completed ? ' (completed)' : ''} at ${s.startedAt}`
    )
  })
  lines.push('')

  // Time Blocks
  const todayBlocks = timeBlocks
    .filter((b) => b.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  lines.push(`=== Today's Time Blocks (${todayBlocks.length}) ===`)
  todayBlocks.forEach((b) => {
    lines.push(
      `  ${b.startTime}-${b.endTime} ${b.title} (${b.category})${b.completed ? ' ✓' : ''}`
    )
  })

  return lines.join('\n')
}

// ─── Helper: Format Time ──────────────────────────────────────────────────────

function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Helper: Format File Size ─────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Typing Indicator Component ───────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-start gap-3 max-w-[85%]"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/20">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="rounded-2xl rounded-tl-sm border bg-card/80 backdrop-blur-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <motion.span
            className="h-2 w-2 rounded-full bg-violet-500"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="h-2 w-2 rounded-full bg-violet-500"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
          />
          <motion.span
            className="h-2 w-2 rounded-full bg-violet-500"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Message Content Renderer (markdown-lite) ─────────────────────────────────

function MessageContent({ content }: { content: string }) {
  const rendered = useMemo(() => {
    return content.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        return (
          <h4 key={i} className="font-bold text-sm mt-3 mb-1">
            {line.slice(4)}
          </h4>
        )
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={i} className="font-bold text-base mt-3 mb-1">
            {line.slice(3)}
          </h3>
        )
      }
      // Bullet points
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <div key={i} className="flex gap-2 ml-1">
            <span className="text-violet-500 mt-0.5 shrink-0">•</span>
            <span>{renderInlineFormatting(line.slice(2))}</span>
          </div>
        )
      }
      // Numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s/)
      if (numberedMatch) {
        return (
          <div key={i} className="flex gap-2 ml-1">
            <span className="text-violet-500 font-medium shrink-0">{numberedMatch[1]}.</span>
            <span>{renderInlineFormatting(line.slice(numberedMatch[0].length))}</span>
          </div>
        )
      }
      // Empty lines
      if (line.trim() === '') {
        return <div key={i} className="h-2" />
      }
      // Regular text
      return <p key={i}>{renderInlineFormatting(line)}</p>
    })
  }, [content])

  return <div className="space-y-0.5 text-sm leading-relaxed">{rendered}</div>
}

function renderInlineFormatting(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    // Italic: *text*
    const italicParts = part.split(/(\*[^*]+\*)/g)
    return italicParts.map((ip, j) => {
      if (ip.startsWith('*') && ip.endsWith('*') && ip.length > 2) {
        return (
          <em key={`${i}-${j}`} className="italic">
            {ip.slice(1, -1)}
          </em>
        )
      }
      return ip
    })
  })
}

// ─── Attachment Preview Component ──────────────────────────────────────────────

function AttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.type === 'image') {
    return (
      <div className="relative group rounded-lg overflow-hidden border border-border/50 max-w-[200px]">
        <img
          src={attachment.url}
          alt={attachment.name}
          className="w-full h-auto max-h-[150px] object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
          <p className="text-[10px] text-white truncate">{attachment.name}</p>
        </div>
      </div>
    )
  }

  // File attachment
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 max-w-[240px]">
      <File className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{attachment.name}</p>
        {attachment.size && (
          <p className="text-[10px] text-muted-foreground">{formatFileSize(attachment.size)}</p>
        )}
      </div>
    </div>
  )
}

// ─── Action Indicator Component ────────────────────────────────────────────────

function ActionIndicator({ action }: { action: AIAction }) {
  const icon = action.executed ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
  ) : (
    <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
  )

  const typeLabels: Record<string, string> = {
    add_task: 'Task Added',
    complete_task: 'Task Completed',
    delete_task: 'Task Deleted',
    add_time_block: 'Time Block Added',
    add_habit: 'Habit Added',
    add_subject: 'Subject Added',
    generate_file: 'File Generated',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
        action.executed
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          : 'bg-muted/50 text-muted-foreground border border-border/50'
      }`}
    >
      {icon}
      <span>{typeLabels[action.type] || action.type}</span>
      {action.data.title && <span className="text-muted-foreground">— {String(action.data.title)}</span>}
      {action.data.name && <span className="text-muted-foreground">— {String(action.data.name)}</span>}
    </motion.div>
  )
}

// ─── Generated File Download Button ────────────────────────────────────────────

function FileDownloadButton({ file }: { file: GeneratedFile }) {
  const isHtml = file.type === 'html'
  const Icon = isHtml ? Presentation : FileText

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => downloadFile(file)}
        className="gap-2 h-8 text-xs border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-950/50"
      >
        <Icon className="h-3.5 w-3.5 text-violet-500" />
        <Download className="h-3 w-3" />
        <span>{file.name}</span>
        <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
      </Button>
    </motion.div>
  )
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────

function WelcomeScreen({ onQuickPrompt }: { onQuickPrompt: (msg: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center h-full px-4 py-12"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-xl shadow-violet-500/25 mb-6">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2">FocusFlow AI</h2>
      <p className="text-muted-foreground text-sm text-center max-w-sm mb-8">
        Your intelligent productivity & study coach. Ask me anything about your tasks, schedule, or study plan.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {QUICK_PROMPTS.map((prompt, i) => {
          const Icon = prompt.icon
          return (
            <motion.button
              key={prompt.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              onClick={() => onQuickPrompt(prompt.message)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-200 border border-transparent hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-md ${prompt.color}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{prompt.label}</span>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIView() {
  const {
    chatMessages,
    addChatMessage,
    clearChat,
    tasks,
    subjects,
    habits,
    studySessions,
    timeBlocks,
    settings,
    addTask,
    completeTask,
    deleteTask,
    addTimeBlock,
    addHabit,
    addSubject,
  } = useAppStore()

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastMessageRef = useRef<string | null>(null)

  // ── Auto-scroll to bottom ────────────────────────────────────────────────

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef.current) {
      const el = scrollRef.current
      const target = el.scrollHeight - el.clientHeight
      if (smooth) {
        el.scrollTo({ top: target, behavior: 'smooth' })
      } else {
        el.scrollTop = target
      }
    }
  }, [])

  useEffect(() => {
    if (chatMessages.length > 0) {
      const lastMsg = chatMessages[chatMessages.length - 1]
      if (lastMsg.id !== lastMessageRef.current) {
        lastMessageRef.current = lastMsg.id
        requestAnimationFrame(() => scrollToBottom())
      }
    }
  }, [chatMessages, scrollToBottom])

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom())
  }, [isLoading, scrollToBottom])

  // ── Auto-resize textarea ─────────────────────────────────────────────────

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const lineHeight = 24
    const maxHeight = lineHeight * 4 + 16
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  // ── File Attachment Handler ──────────────────────────────────────────────

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith('image/')

      if (isImage) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string
          const attachment: ChatAttachment = {
            id: Math.random().toString(36).substring(2) + Date.now().toString(36),
            name: file.name,
            type: 'image',
            url: dataUrl,
            size: file.size,
          }
          setPendingAttachments((prev) => [...prev, attachment])
        }
        reader.readAsDataURL(file)
      } else {
        // For non-image files, just store metadata
        const attachment: ChatAttachment = {
          id: Math.random().toString(36).substring(2) + Date.now().toString(36),
          name: file.name,
          type: 'file',
          url: '',
          size: file.size,
        }
        setPendingAttachments((prev) => [...prev, attachment])
      }
    })

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const removePendingAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  // ── Send Message ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (messageText: string) => {
      const trimmed = messageText.trim()
      if (!trimmed && pendingAttachments.length === 0) return
      if (isLoading) return

      setInput('')
      setError(null)

      // Process attachments - separate images for VLM
      const imageAttachments = pendingAttachments.filter((a) => a.type === 'image')
      const fileAttachments = pendingAttachments.filter((a) => a.type === 'file')
      const hasImages = imageAttachments.length > 0

      // Build display content
      let displayContent = trimmed
      if (fileAttachments.length > 0) {
        displayContent += '\n\nAttached files: ' + fileAttachments.map((f) => f.name).join(', ')
      }
      if (hasImages) {
        displayContent += '\n\nAttached images: ' + imageAttachments.map((f) => f.name).join(', ')
      }

      // Add user message
      const userMessage: ChatMessage = {
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        role: 'user',
        content: displayContent,
        timestamp: new Date().toISOString(),
        attachments: [...pendingAttachments],
      }
      addChatMessage(userMessage)
      setPendingAttachments([])

      // Build context
      const context = buildContext(tasks, subjects, habits, studySessions, timeBlocks, settings)

      // Build chat history for memory (last 20 messages, stripped of action blocks)
      const chatHistory = chatMessages.slice(-20).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))

      setIsLoading(true)

      try {
        // If we have images, send via VLM
        let imageData: string | undefined
        let imagePrompt: string | undefined

        if (hasImages) {
          // Use the first image for VLM analysis
          imageData = imageAttachments[0].url
          imagePrompt = trimmed || 'Please analyze this image in the context of my productivity and study needs.'
        }

        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed || 'Please analyze the attached image.',
            context,
            imageData,
            imagePrompt,
            history: chatHistory,
          }),
        })

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`)
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        // Parse actions from AI response
        const { text, actions } = parseActions(data.response || '')

        // Execute actions using the store directly
        const store = useAppStore.getState()
        const executedActions: AIAction[] = []
        const generatedFiles: GeneratedFile[] = []

        for (const action of actions) {
          if (action.type === 'generate_file') {
            const file = generateFileFromAction(action)
            if (file) {
              generatedFiles.push(file)
              executedActions.push({
                type: action.type,
                data: action.data,
                executed: true,
              })
            }
          } else {
            const result = executeAction(action, store)
            executedActions.push({
              type: action.type,
              data: action.data,
              executed: result.success,
            })
          }
        }

        const assistantMessage: ChatMessage = {
          id: Math.random().toString(36).substring(2) + Date.now().toString(36),
          role: 'assistant',
          content: text || 'I\'ve processed your request.',
          timestamp: new Date().toISOString(),
          actions: executedActions.length > 0 ? executedActions : undefined,
          generatedFiles: generatedFiles.length > 0 ? generatedFiles : undefined,
        }
        addChatMessage(assistantMessage)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
        setError(errorMessage)
      } finally {
        setIsLoading(false)
        textareaRef.current?.focus()
      }
    },
    [isLoading, addChatMessage, chatMessages, tasks, subjects, habits, studySessions, timeBlocks, settings, pendingAttachments]
  )

  // ── Handle Quick Prompt ──────────────────────────────────────────────────

  const handleQuickPrompt = useCallback(
    (message: string) => {
      sendMessage(message)
    },
    [sendMessage]
  )

  // ── Retry last failed message ────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    const lastUserMsg = [...chatMessages].reverse().find((m) => m.role === 'user')
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content)
    }
  }, [chatMessages, sendMessage])

  // ── Handle Key Press ─────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage(input)
      }
    },
    [input, sendMessage]
  )

  // ── Clear Chat ───────────────────────────────────────────────────────────

  const handleClearChat = useCallback(() => {
    clearChat()
    setError(null)
    lastMessageRef.current = null
  }, [clearChat])

  // ── Has messages check ───────────────────────────────────────────────────

  const hasMessages = chatMessages.length > 0

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">FocusFlow AI</h2>
              <p className="text-xs text-muted-foreground">Your productivity coach</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMessages && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="text-muted-foreground hover:text-destructive gap-1.5 h-8"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
          </div>
        </div>

        {/* Suggestion Chips (visible when there are messages) */}
        {hasMessages && (
          <div className="flex items-center gap-2 px-4 md:px-6 pb-3 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((prompt) => {
              const Icon = prompt.icon
              return (
                <button
                  key={prompt.id}
                  onClick={() => handleQuickPrompt(prompt.message)}
                  disabled={isLoading}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap border border-transparent hover:border-violet-200 dark:hover:border-violet-800 disabled:opacity-50 disabled:cursor-not-allowed ${prompt.color}`}
                >
                  <Icon className="h-3 w-3" />
                  {prompt.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Chat Area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {!hasMessages ? (
          <WelcomeScreen onQuickPrompt={handleQuickPrompt} />
        ) : (
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto custom-scrollbar"
          >
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-5">
              <AnimatePresence mode="popLayout">
                {chatMessages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isLast={index === chatMessages.length - 1}
                  />
                ))}
              </AnimatePresence>

              {/* Typing Indicator */}
              {isLoading && <TypingIndicator />}

              {/* Error State */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 max-w-[85%]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-destructive/20 bg-destructive/5 px-4 py-3">
                    <p className="text-sm text-destructive font-medium">Failed to get response</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      className="mt-2 h-7 text-xs gap-1.5"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Retry
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Input Area ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-3">
          {/* Pending attachments preview */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="relative group flex items-center gap-2 rounded-lg border bg-muted/30 px-2 py-1.5"
                >
                  {att.type === 'image' ? (
                    <ImageIcon className="h-3.5 w-3.5 text-violet-500" />
                  ) : (
                    <File className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-xs max-w-[120px] truncate">{att.name}</span>
                  {att.size && (
                    <span className="text-[10px] text-muted-foreground">{formatFileSize(att.size)}</span>
                  )}
                  <button
                    onClick={() => removePendingAttachment(att.id)}
                    className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-end gap-2 rounded-2xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-violet-500/30 focus-within:border-violet-300 dark:focus-within:border-violet-700 transition-all duration-200">
            {/* Paperclip / Attach button */}
            <Button
              variant="ghost"
              size="icon"
              disabled={isLoading}
              onClick={() => fileInputRef.current?.click()}
              className="mb-1.5 ml-1.5 h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
              title="Attach file or image"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.doc,.docx"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask FocusFlow AI anything..."
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none bg-transparent px-2 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50 max-h-[112px] min-h-[44px]"
            />
            <Button
              size="icon"
              disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
              onClick={() => sendMessage(input)}
              className="mb-1.5 mr-1.5 h-8 w-8 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-md shadow-violet-500/20 disabled:opacity-40 disabled:shadow-none transition-all duration-200"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground/50 text-center">
            <Zap className="inline h-2.5 w-2.5 mr-0.5" />
            Press Enter to send · Shift+Enter for new line · 📎 Attach images & files
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Message Bubble Component ─────────────────────────────────────────────────

function MessageBubble({ message, isLast }: { message: ChatMessage; isLast: boolean }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        mass: 0.8,
      }}
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20">
          <User className="h-4 w-4 text-white" />
        </div>
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg shadow-violet-500/20">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Message Content */}
      <div
        className={`max-w-[80%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}
      >
        {isUser ? (
          // User message bubble
          <div className="space-y-2">
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-end">
                {message.attachments.map((att) => (
                  <AttachmentPreview key={att.id} attachment={att} />
                ))}
              </div>
            )}
            <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-violet-500 to-purple-600 text-white px-4 py-2.5 shadow-md shadow-violet-500/15">
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          </div>
        ) : (
          // AI message bubble — glass effect
          <div className="rounded-2xl rounded-tl-sm border bg-card/70 backdrop-blur-md shadow-sm relative overflow-hidden">
            {/* Subtle gradient accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] via-transparent to-fuchsia-500/[0.03] pointer-events-none" />
            <div className="relative px-4 py-3 space-y-3">
              <MessageContent content={message.content} />

              {/* Action indicators */}
              {message.actions && message.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {message.actions.map((action, i) => (
                    <ActionIndicator key={`${action.type}-${i}`} action={action} />
                  ))}
                </div>
              )}

              {/* Generated file downloads */}
              {message.generatedFiles && message.generatedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {message.generatedFiles.map((file) => (
                    <FileDownloadButton key={file.id} file={file} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p
          className={`text-[10px] text-muted-foreground/50 mt-1 px-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}
        >
          {formatMessageTime(message.timestamp)}
        </p>
      </div>
    </motion.div>
  )
}
