'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  ChevronDown,
  ChevronRight,
  Timer,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  BookOpen,
  Clock,
  Brain,
  Zap,
  Coffee,
  Target,
  Circle,
  CheckCircle2,
  Maximize,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useAppStore,
  type Subject,
  type Topic,
  type PomodoroState,
} from '@/lib/store'
import { toast } from 'sonner'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#dc2626',
  '#d97706',
  '#ec4899',
  '#6366f1',
  '#0891b2',
]

const MODE_CONFIG: Record<string, { label: string; icon: typeof Timer; gradient: string; ringColor: string }> = {
  work: {
    label: 'Focus Time',
    icon: Timer,
    gradient: 'from-violet-600 via-purple-600 to-fuchsia-600',
    ringColor: '#8b5cf6',
  },
  break: {
    label: 'Break',
    icon: Coffee,
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    ringColor: '#10b981',
  },
  'long-break': {
    label: 'Long Break',
    icon: Coffee,
    gradient: 'from-sky-500 via-blue-500 to-indigo-500',
    ringColor: '#3b82f6',
  },
}

const SESSION_TYPE_CONFIG: Record<string, { label: string; icon: typeof Timer; color: string; bg: string }> = {
  pomodoro: { label: 'Pomodoro', icon: Timer, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-950/40' },
  'deep-work': { label: 'Deep Work', icon: Brain, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/40' },
  free: { label: 'Free Study', icon: BookOpen, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-950/40' },
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}

function getSubjectProgress(subject: Subject): number {
  if (subject.topics.length === 0) return 0
  const completed = subject.topics.filter(t => t.completed).length
  return Math.round((completed / subject.topics.length) * 100)
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
}

const topicVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto', transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2 } },
}

// ─── Progress Ring Component ──────────────────────────────────────────────────

function TimerRing({
  progress,
  size = 240,
  strokeWidth = 8,
  color = '#8b5cf6',
  isRunning,
}: {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  isRunning: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - progress * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={strokeWidth}
      />
      {/* Glow ring */}
      {isRunning && (
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset, opacity: [0.15, 0.3, 0.15] }}
          transition={{
            strokeDashoffset: { duration: 0.8, ease: 'easeOut' },
            opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="blur-sm"
        />
      )}
      {/* Progress ring */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── Pomodoro Timer Component ─────────────────────────────────────────────────

function PomodoroTimer() {
  const { pomodoro, setPomodoro, resetPomodoro, settings, subjects, addStudySession, addXP } = useAppStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const modeConfig = MODE_CONFIG[pomodoro.mode]
  const totalTime = useMemo(() => {
    switch (pomodoro.mode) {
      case 'work': return settings.pomodoroWork * 60
      case 'break': return settings.pomodoroBreak * 60
      case 'long-break': return settings.pomodoroLongBreak * 60
      default: return settings.pomodoroWork * 60
    }
  }, [pomodoro.mode, settings])

  const progress = totalTime > 0 ? pomodoro.timeLeft / totalTime : 0

  // Subject and topic selector state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(pomodoro.subjectId || '')
  const [selectedTopicId, setSelectedTopicId] = useState<string>(pomodoro.topicId || '')

  const selectedSubject = useMemo(
    () => subjects.find(s => s.id === selectedSubjectId),
    [subjects, selectedSubjectId]
  )

  const availableTopics = useMemo(
    () => selectedSubject?.topics || [],
    [selectedSubject]
  )

  // Timer tick
  useEffect(() => {
    if (pomodoro.isRunning && !pomodoro.isPaused) {
      intervalRef.current = setInterval(() => {
        setPomodoro({ timeLeft: Math.max(0, pomodoro.timeLeft - 1) })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [pomodoro.isRunning, pomodoro.isPaused, pomodoro.timeLeft, setPomodoro])

  // Timer completion handler
  useEffect(() => {
    if (pomodoro.timeLeft === 0 && pomodoro.isRunning) {
      // Determine what happened
      const wasWork = pomodoro.mode === 'work'
      const subjectName = selectedSubject?.name || 'General'

      if (wasWork) {
        // Record study session
        addStudySession({
          subjectId: selectedSubjectId || undefined,
          topicId: selectedTopicId || undefined,
          subjectName,
          type: 'pomodoro',
          duration: settings.pomodoroWork,
          completed: true,
          startedAt: new Date(Date.now() - settings.pomodoroWork * 60000).toISOString(),
          endedAt: new Date().toISOString(),
        })

        // Award XP for completing a focus session
        addXP(15)

        // Switch to break or long break
        const nextRound = pomodoro.round + 1
        if (nextRound % settings.pomodoroRounds === 0) {
          setPomodoro({
            mode: 'long-break',
            timeLeft: settings.pomodoroLongBreak * 60,
            isPaused: false,
            round: pomodoro.round,
          })
          toast.success('Great work! Time for a long break.', { description: `Completed round ${pomodoro.round}` })
        } else {
          setPomodoro({
            mode: 'break',
            timeLeft: settings.pomodoroBreak * 60,
            isPaused: false,
            round: pomodoro.round,
          })
          toast.success('Focus session complete!', { description: 'Take a short break.' })
        }
      } else {
        // Was break, switch to work
        const nextRound = pomodoro.mode === 'long-break' ? pomodoro.round + 1 : pomodoro.round
        setPomodoro({
          mode: 'work',
          timeLeft: settings.pomodoroWork * 60,
          isPaused: false,
          round: nextRound,
        })
        toast('Break over!', { description: 'Ready to focus again?' })
      }
    }
    }, [pomodoro.timeLeft])

  const handleStart = useCallback(() => {
    if (!pomodoro.isRunning) {
      setPomodoro({
        isRunning: true,
        isPaused: false,
        timeLeft: totalTime,
        subjectId: selectedSubjectId || undefined,
        topicId: selectedTopicId || undefined,
      })
    } else if (pomodoro.isPaused) {
      setPomodoro({ isPaused: false })
    } else {
      setPomodoro({ isPaused: true })
    }
  }, [pomodoro.isRunning, pomodoro.isPaused, totalTime, selectedSubjectId, selectedTopicId, setPomodoro])

  const handleSkip = useCallback(() => {
    if (pomodoro.mode === 'work') {
      const nextRound = pomodoro.round + 1
      if (nextRound % settings.pomodoroRounds === 0) {
        setPomodoro({ mode: 'long-break', timeLeft: settings.pomodoroLongBreak * 60, isPaused: false, round: pomodoro.round })
      } else {
        setPomodoro({ mode: 'break', timeLeft: settings.pomodoroBreak * 60, isPaused: false, round: pomodoro.round })
      }
    } else {
      const nextRound = pomodoro.mode === 'long-break' ? pomodoro.round + 1 : pomodoro.round
      setPomodoro({ mode: 'work', timeLeft: settings.pomodoroWork * 60, isPaused: false, round: nextRound })
    }
  }, [pomodoro.mode, pomodoro.round, settings, setPomodoro])

  const handleReset = useCallback(() => {
    resetPomodoro()
    setSelectedSubjectId('')
    setSelectedTopicId('')
  }, [resetPomodoro])

  const ModeIcon = modeConfig.icon

  return (
    <Card className="relative overflow-hidden border-0">
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${modeConfig.gradient}`} />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0djJoLTJ2LTJoMnptMC0yaDJ2MmgtMnYtMnptLTQgNHYyaC0ydi0yaDJ6bTQgMHYyaC0ydi0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

      <CardContent className="relative p-6 flex flex-col items-center gap-5">
        {/* Mode indicator */}
        <div className="flex items-center gap-2 text-white/90">
          <ModeIcon className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">{modeConfig.label}</span>
        </div>

        {/* Circular Timer */}
        <div className="relative flex items-center justify-center">
          <TimerRing
            progress={progress}
            size={220}
            strokeWidth={7}
            color={modeConfig.ringColor}
            isRunning={pomodoro.isRunning && !pomodoro.isPaused}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-white tabular-nums tracking-tight drop-shadow-lg">
              {formatMMSS(pomodoro.timeLeft)}
            </span>
            <span className="text-white/60 text-xs mt-1 font-medium">
              Round {pomodoro.round} of {settings.pomodoroRounds}
            </span>
          </div>
        </div>

        {/* Round indicators */}
        <div className="flex items-center gap-2">
          {Array.from({ length: settings.pomodoroRounds }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i < pomodoro.round
                  ? 'w-6 bg-white/80'
                  : i === pomodoro.round - 1 || (pomodoro.round === 1 && i === 0 && pomodoro.mode === 'work')
                    ? 'w-6 bg-white/40 animate-pulse'
                    : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Subject/Topic selector */}
        <div className="w-full max-w-xs space-y-2">
          <Select value={selectedSubjectId} onValueChange={(v) => { setSelectedSubjectId(v); setSelectedTopicId('') }}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-9 text-sm">
              <SelectValue placeholder="What are you studying?" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {availableTopics.length > 0 && (
            <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-9 text-sm">
                <SelectValue placeholder="Select a topic (optional)" />
              </SelectTrigger>
              <SelectContent>
                {availableTopics.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-white/70 hover:text-white hover:bg-white/10"
            onClick={handleReset}
          >
            <RotateCcw className="h-4.5 w-4.5" />
          </Button>

          <motion.button
            className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors border border-white/30"
            onClick={handleStart}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {!pomodoro.isRunning || pomodoro.isPaused ? (
              <Play className="h-6 w-6 text-white ml-0.5" />
            ) : (
              <Pause className="h-6 w-6 text-white" />
            )}
          </motion.button>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-white/70 hover:text-white hover:bg-white/10"
            onClick={handleSkip}
          >
            <SkipForward className="h-4.5 w-4.5" />
          </Button>
        </div>

        {/* Enter Focus Mode */}
        <Button
          variant="ghost"
          size="sm"
          className="text-white/60 hover:text-white hover:bg-white/10 text-xs gap-1.5"
          onClick={() => useAppStore.getState().setCurrentView('focus')}
        >
          <Maximize className="h-3.5 w-3.5" />
          Focus Mode
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Subject Card Component ───────────────────────────────────────────────────

function SubjectCard({
  subject,
  onEdit,
  onDelete,
  onAddTopic,
  onToggleTopic,
  onEditTopic,
  onDeleteTopic,
}: {
  subject: Subject
  onEdit: () => void
  onDelete: () => void
  onAddTopic: () => void
  onToggleTopic: (topic: Topic) => void
  onEditTopic: (topic: Topic) => void
  onDeleteTopic: (topic: Topic) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const progress = getSubjectProgress(subject)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <motion.div
        className="group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <Card className={`border transition-all duration-200 ${isOpen ? 'shadow-md' : 'hover:shadow-sm'} ${subject.topics.length > 0 ? 'cursor-pointer' : ''}`}>
          <CollapsibleTrigger asChild>
            <div className="p-4">
              <div className="flex items-center gap-3">
                {/* Expand/collapse icon */}
                <div className="shrink-0 text-muted-foreground/50">
                  {subject.topics.length > 0 ? (
                    isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>

                {/* Color dot */}
                <span
                  className="h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-background"
                  style={{ backgroundColor: subject.color, ringColor: subject.color + '40' }}
                />

                {/* Name & info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate">{subject.name}</h3>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4.5 shrink-0 bg-muted">
                      {subject.topics.length} topic{subject.topics.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16">
                    <Progress value={progress} className="h-1.5" />
                  </div>
                  <span className="text-xs font-bold tabular-nums min-w-[28px] text-right" style={{ color: subject.color }}>
                    {progress}%
                  </span>
                </div>

                {/* Actions */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      className="flex items-center gap-0.5"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.12 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); onEdit() }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); onDelete() }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CollapsibleTrigger>

          {/* Topics */}
          <CollapsibleContent>
            <div className="px-4 pb-3 space-y-1">
              <Separator className="mb-3" />
              <AnimatePresence>
                {subject.topics.map((topic, i) => (
                  <motion.div
                    key={topic.id}
                    variants={topicVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ delay: i * 0.04 }}
                    className="group/topic flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Completion toggle */}
                    <button
                      className="shrink-0 transition-colors"
                      onClick={() => onToggleTopic(topic)}
                    >
                      {topic.completed ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                      ) : (
                        <Circle className="h-4.5 w-4.5 text-muted-foreground/40 hover:text-muted-foreground" />
                      )}
                    </button>

                    {/* Topic name + progress */}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm truncate block ${topic.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                        {topic.name}
                      </span>
                    </div>

                    {/* Review count */}
                    {topic.reviewCount > 0 && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {topic.reviewCount} review{topic.reviewCount !== 1 ? 's' : ''}
                      </span>
                    )}

                    {/* Progress */}
                    <div className="w-12 shrink-0">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: subject.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${topic.progress}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold tabular-nums min-w-[26px] text-right" style={{ color: subject.color }}>
                      {topic.progress}%
                    </span>

                    {/* Topic actions */}
                    <div className="opacity-0 group-hover/topic:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onEditTopic(topic)}
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onDeleteTopic(topic)}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add topic button */}
              <button
                className="flex items-center gap-2 w-full p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm"
                onClick={(e) => { e.stopPropagation(); onAddTopic() }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add topic</span>
              </button>
            </div>
          </CollapsibleContent>
        </Card>
      </motion.div>
    </Collapsible>
  )
}

// ─── Study Session History Component ──────────────────────────────────────────

function SessionHistory() {
  const { studySessions } = useAppStore()

  const recentSessions = useMemo(
    () => [...studySessions]
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 10),
    [studySessions]
  )

  if (recentSessions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/50">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-sm">Session History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Target className="h-8 w-8 mb-2 text-muted-foreground/30" />
            <p className="text-xs font-medium">No sessions yet</p>
            <p className="text-[10px]">Start a pomodoro to track your study</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/50">
            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-sm">Session History</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="space-y-1 max-h-72 overflow-y-auto custom-scrollbar pr-1">
          {recentSessions.map((session, i) => {
            const typeConfig = SESSION_TYPE_CONFIG[session.type] || SESSION_TYPE_CONFIG.pomodoro
            const TypeIcon = typeConfig.icon

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Type icon */}
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${typeConfig.bg}`}>
                  <TypeIcon className={`h-3.5 w-3.5 ${typeConfig.color}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {session.subjectName || 'General'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(session.startedAt)}
                  </span>
                </div>

                {/* Duration */}
                <span className="text-xs font-semibold tabular-nums text-muted-foreground shrink-0">
                  {session.duration}m
                </span>

                {/* Type badge */}
                <Badge
                  variant="secondary"
                  className={`text-[9px] px-1.5 py-0 h-4.5 shrink-0 border-0 ${typeConfig.bg} ${typeConfig.color}`}
                >
                  {typeConfig.label}
                </Badge>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Add/Edit Subject Dialog ──────────────────────────────────────────────────

function SubjectForm({
  editingSubject,
  onSave,
  onCancel,
}: {
  editingSubject: Subject | null
  onSave: (data: { name: string; color: string }) => void
  onCancel: () => void
}) {
  const isEditing = !!editingSubject
  const [name, setName] = useState(isEditing ? editingSubject.name : '')
  const [color, setColor] = useState(isEditing ? editingSubject.color : PRESET_COLORS[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), color })
    onCancel()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
        <DialogDescription>
          {isEditing ? 'Update your subject details.' : 'Create a new subject to organize your studies.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="subject-name">Name</Label>
          <Input
            id="subject-name"
            placeholder="e.g., Mathematics"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Color picker */}
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full transition-all duration-200 ${
                  color === c ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c, ringColor: c }}
              />
            ))}
          </div>
          {/* Preview */}
          <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-muted/50">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium">{name || 'Subject Name'}</span>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" disabled={!name.trim()}>
            {isEditing ? 'Save Changes' : 'Add Subject'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

function SubjectDialog({
  open,
  onOpenChange,
  editingSubject,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingSubject: Subject | null
  onSave: (data: { name: string; color: string }) => void
}) {
  const formKey = editingSubject ? `edit-${editingSubject.id}` : 'add'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <SubjectForm
          key={formKey}
          editingSubject={editingSubject}
          onSave={(data) => { onSave(data); onOpenChange(false) }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

// ─── Add/Edit Topic Dialog ────────────────────────────────────────────────────

function TopicForm({
  editingTopic,
  subjectName,
  onSave,
  onCancel,
}: {
  editingTopic: Topic | null
  subjectName: string
  onSave: (data: { name: string; notes?: string }) => void
  onCancel: () => void
}) {
  const isEditing = !!editingTopic
  const [name, setName] = useState(isEditing ? editingTopic.name : '')
  const [notes, setNotes] = useState(isEditing ? editingTopic.notes || '' : '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), notes: notes.trim() || undefined })
    onCancel()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Topic' : 'Add Topic'}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? `Update topic in ${subjectName}.`
            : `Add a new topic to ${subjectName}.`}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="topic-name">Name</Label>
          <Input
            id="topic-name"
            placeholder="e.g., Linear Algebra"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="topic-notes">Notes (optional)</Label>
          <Textarea
            id="topic-notes"
            placeholder="Key concepts, resources, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" disabled={!name.trim()}>
            {isEditing ? 'Save Changes' : 'Add Topic'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

function TopicDialog({
  open,
  onOpenChange,
  editingTopic,
  subjectName,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTopic: Topic | null
  subjectName: string
  onSave: (data: { name: string; notes?: string }) => void
}) {
  const formKey = editingTopic ? `edit-${editingTopic.id}` : 'add'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <TopicForm
          key={formKey}
          editingTopic={editingTopic}
          subjectName={subjectName}
          onSave={(data) => { onSave(data); onOpenChange(false) }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" onClick={onConfirm}>
              Delete
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main StudyView Component ─────────────────────────────────────────────────

export default function StudyView() {
  const {
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
    addTopic,
    updateTopic,
    deleteTopic,
    studySessions,
    settings,
  } = useAppStore()

  // Dialog state
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [topicDialogOpen, setTopicDialogOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [topicSubjectId, setTopicSubjectId] = useState<string>('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'subject' | 'topic'; id: string; subjectId?: string } | null>(null)

  // Computed
  const totalStudyTimeToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return studySessions
      .filter(s => s.completed && s.startedAt.startsWith(today))
      .reduce((acc, s) => acc + s.duration, 0)
  }, [studySessions])

  const topicSubjectName = useMemo(
    () => subjects.find(s => s.id === topicSubjectId)?.name || '',
    [subjects, topicSubjectId]
  )

  // Handlers
  const handleAddSubject = useCallback(() => {
    setEditingSubject(null)
    setSubjectDialogOpen(true)
  }, [])

  const handleEditSubject = useCallback((subject: Subject) => {
    setEditingSubject(subject)
    setSubjectDialogOpen(true)
  }, [])

  const handleSaveSubject = useCallback(
    (data: { name: string; color: string }) => {
      if (editingSubject) {
        updateSubject(editingSubject.id, data)
      } else {
        addSubject(data)
      }
    },
    [editingSubject, addSubject, updateSubject]
  )

  const handleDeleteSubject = useCallback((subject: Subject) => {
    setDeleteTarget({ type: 'subject', id: subject.id })
    setDeleteDialogOpen(true)
  }, [])

  const handleAddTopic = useCallback((subjectId: string) => {
    setTopicSubjectId(subjectId)
    setEditingTopic(null)
    setTopicDialogOpen(true)
  }, [])

  const handleEditTopic = useCallback((subjectId: string, topic: Topic) => {
    setTopicSubjectId(subjectId)
    setEditingTopic(topic)
    setTopicDialogOpen(true)
  }, [])

  const handleSaveTopic = useCallback(
    (data: { name: string; notes?: string }) => {
      if (editingTopic) {
        updateTopic(topicSubjectId, editingTopic.id, data)
      } else {
        addTopic(topicSubjectId, data)
      }
    },
    [editingTopic, topicSubjectId, addTopic, updateTopic]
  )

  const handleToggleTopic = useCallback(
    (subjectId: string, topic: Topic) => {
      updateTopic(subjectId, topic.id, {
        completed: !topic.completed,
        progress: topic.completed ? topic.progress : 100,
      })
    },
    [updateTopic]
  )

  const handleDeleteTopic = useCallback((subjectId: string, topic: Topic) => {
    setDeleteTarget({ type: 'topic', id: topic.id, subjectId })
    setDeleteDialogOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'subject') {
      deleteSubject(deleteTarget.id)
    } else if (deleteTarget.subjectId) {
      deleteTopic(deleteTarget.subjectId, deleteTarget.id)
    }
    setDeleteTarget(null)
  }, [deleteTarget, deleteSubject, deleteTopic])

  return (
    <motion.div
      className="space-y-5 p-4 md:p-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/50">
            <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Study</h1>
            <p className="text-xs text-muted-foreground">
              {totalStudyTimeToday > 0
                ? `${Math.floor(totalStudyTimeToday / 60)}h ${totalStudyTimeToday % 60}m studied today`
                : 'Start a focus session to begin'}
            </p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleAddSubject}>
          <Plus className="h-3.5 w-3.5" />
          Add Subject
        </Button>
      </motion.div>

      {/* ── Main Content: Two Panel Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left Panel: Subjects */}
        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-3">
          {subjects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BookOpen className="h-10 w-10 mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium mb-1">No subjects yet</p>
                <p className="text-xs mb-4">Add a subject to organize your study topics</p>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleAddSubject}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Subject
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {subjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onEdit={() => handleEditSubject(subject)}
                  onDelete={() => handleDeleteSubject(subject)}
                  onAddTopic={() => handleAddTopic(subject.id)}
                  onToggleTopic={(topic) => handleToggleTopic(subject.id, topic)}
                  onEditTopic={(topic) => handleEditTopic(subject.id, topic)}
                  onDeleteTopic={(topic) => handleDeleteTopic(subject.id, topic)}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Right Panel: Timer + History */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-5">
          {/* Pomodoro Timer */}
          <PomodoroTimer />

          {/* Session History */}
          <SessionHistory />
        </motion.div>
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <SubjectDialog
        open={subjectDialogOpen}
        onOpenChange={setSubjectDialogOpen}
        editingSubject={editingSubject}
        onSave={handleSaveSubject}
      />

      <TopicDialog
        open={topicDialogOpen}
        onOpenChange={setTopicDialogOpen}
        editingTopic={editingTopic}
        subjectName={topicSubjectName}
        onSave={handleSaveTopic}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={deleteTarget?.type === 'subject' ? 'Delete Subject' : 'Delete Topic'}
        description={
          deleteTarget?.type === 'subject'
            ? 'This will permanently delete this subject and all its topics. This action cannot be undone.'
            : 'This will permanently delete this topic. This action cannot be undone.'
        }
        onConfirm={handleConfirmDelete}
      />
    </motion.div>
  )
}
