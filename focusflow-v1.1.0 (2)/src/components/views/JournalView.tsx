'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Flame,
  FileText,
  Sparkles,
  PenLine,
  Heart,
  Hash,
  Trash2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { useAppStore, type JournalEntry } from '@/lib/store'

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_OPTIONS: {
  value: JournalEntry['mood']
  emoji: string
  label: string
  color: string
  bgColor: string
  borderColor: string
}[] = [
  { value: 'great', emoji: '😄', label: 'Great', color: '#10b981', bgColor: 'bg-emerald-100 dark:bg-emerald-950/40', borderColor: 'border-emerald-300 dark:border-emerald-700' },
  { value: 'good', emoji: '🙂', label: 'Good', color: '#22c55e', bgColor: 'bg-green-100 dark:bg-green-950/40', borderColor: 'border-green-300 dark:border-green-700' },
  { value: 'okay', emoji: '😐', label: 'Okay', color: '#f59e0b', bgColor: 'bg-amber-100 dark:bg-amber-950/40', borderColor: 'border-amber-300 dark:border-amber-700' },
  { value: 'bad', emoji: '😞', label: 'Bad', color: '#f97316', bgColor: 'bg-orange-100 dark:bg-orange-950/40', borderColor: 'border-orange-300 dark:border-orange-700' },
  { value: 'awful', emoji: '😢', label: 'Awful', color: '#ef4444', bgColor: 'bg-red-100 dark:bg-red-950/40', borderColor: 'border-red-300 dark:border-red-700' },
]

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (formatDateStr(today) === dateStr) return 'Today'
  if (formatDateStr(yesterday) === dateStr) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getWordCount(text: string): number {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

function getLast7Days(): string[] {
  const days: string[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(formatDateStr(d))
  }
  return days
}

const DAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function padGratitudes(gratitudes?: string[]): string[] {
  if (!gratitudes || gratitudes.length === 0) return ['', '', '']
  return [...gratitudes, ...Array(Math.max(0, 3 - gratitudes.length)).fill('')].slice(0, 3)
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
}

const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

// ─── Journal Editor (inner component, keyed by date) ─────────────────────────

function JournalEditor({ selectedDate, currentEntry }: {
  selectedDate: string
  currentEntry: JournalEntry | undefined
}) {
  const { addJournalEntry, deleteJournalEntry, checkAchievements } = useAppStore()

  // Initialize local state from entry data — this runs once per mount (date key ensures remount)
  const [content, setContent] = useState(currentEntry?.content ?? '')
  const [mood, setMood] = useState<JournalEntry['mood']>(currentEntry?.mood ?? undefined)
  const [gratitudes, setGratitudes] = useState<string[]>(padGratitudes(currentEntry?.gratitudes))

  // Auto-save debounce timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Has any meaningful content
  const hasContent = content.trim().length > 0 || mood !== undefined || gratitudes.some(g => g.trim().length > 0)
  const wordCount = getWordCount(content)

  // Auto-save with debounce
  const saveEntry = useCallback(() => {
    if (!hasContent && !currentEntry) return

    addJournalEntry({
      date: selectedDate,
      content,
      mood,
      gratitudes: gratitudes.filter(g => g.trim().length > 0),
    })
    checkAchievements()
  }, [selectedDate, content, mood, gratitudes, hasContent, currentEntry, addJournalEntry, checkAchievements])

  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(() => {
      saveEntry()
    }, 800)
  }, [saveEntry])

  // Trigger auto-save on content changes
  useEffect(() => {
    debouncedSave()
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [content, mood, gratitudes, debouncedSave])

  // Handle delete
  const handleDelete = useCallback(() => {
    if (currentEntry) {
      deleteJournalEntry(currentEntry.id)
      setContent('')
      setMood(undefined)
      setGratitudes(['', '', ''])
    }
  }, [currentEntry, deleteJournalEntry])

  // Gratitude change handler
  const updateGratitude = useCallback((index: number, value: string) => {
    setGratitudes(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  const isFuture = selectedDate > formatDateStr(new Date())

  return (
    <>
      {/* ── Future Date Notice ──────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isFuture ? (
          <motion.div
            key="future"
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card className="border-dashed bg-muted/30">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                <CalendarDays className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Can&apos;t write for future dates</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Navigate to today or a past date to journal</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-5"
          >
            {/* ── Mood Selector ──────────────────────────────────────── */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-semibold">How are you feeling?</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {MOOD_OPTIONS.map((option) => {
                      const isSelected = mood === option.value
                      return (
                        <motion.button
                          key={option.value}
                          onClick={() => setMood(isSelected ? undefined : option.value)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                            isSelected
                              ? `${option.bgColor} ${option.borderColor} border ring-1 ring-current/20`
                              : 'border-transparent hover:bg-muted/50 text-muted-foreground'
                          }`}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <span className="text-base">{option.emoji}</span>
                          <span className={`text-xs ${isSelected ? '' : 'hidden sm:inline'}`}>
                            {option.label}
                          </span>
                        </motion.button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Journal Content ────────────────────────────────────── */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <PenLine className="h-4 w-4 text-violet-500" />
                      <h3 className="text-sm font-semibold">Daily Reflection</h3>
                    </div>
                    {hasContent && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1.5"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Auto-saved</span>
                      </motion.div>
                    )}
                  </div>
                  <Textarea
                    placeholder="Write your thoughts, reflections, or anything on your mind... Markdown is supported."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[240px] md:min-h-[320px] resize-none text-sm leading-relaxed border-0 bg-transparent focus-visible:ring-0 p-0 placeholder:text-muted-foreground/50"
                  />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground">
                      {wordCount} {wordCount === 1 ? 'word' : 'words'}
                    </span>
                    {currentEntry && (
                      <span className="text-[10px] text-muted-foreground">
                        Last edited {new Date(currentEntry.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Gratitude Section ──────────────────────────────────── */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="h-4 w-4 text-rose-500" />
                    <h3 className="text-sm font-semibold">What are you grateful for today?</h3>
                  </div>
                  <div className="space-y-2.5">
                    {gratitudes.map((g, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}.</span>
                        <Input
                          placeholder={i === 0 ? "e.g., A good night's sleep" : i === 1 ? 'e.g., Supportive friends' : 'e.g., Learning something new'}
                          value={g}
                          onChange={(e) => updateGratitude(i, e.target.value)}
                          className="text-sm h-9 border-dashed focus-visible:border-solid"
                        />
                      </div>
                    ))}
                  </div>
                  {gratitudes.filter(g => g.trim().length > 0).length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1.5 mt-3"
                    >
                      <Heart className="h-3 w-3 text-rose-400" />
                      <span className="text-[10px] text-rose-500 dark:text-rose-400 font-medium">
                        {gratitudes.filter(g => g.trim().length > 0).length} gratitude{gratitudes.filter(g => g.trim().length > 0).length !== 1 ? 's' : ''} recorded
                      </span>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JournalView() {
  const { journalEntries, deleteJournalEntry } = useAppStore()

  // Current date state
  const [selectedDate, setSelectedDate] = useState(() => formatDateStr(new Date()))

  // Get current entry for selected date
  const currentEntry = useMemo(
    () => journalEntries.find(e => e.date === selectedDate),
    [journalEntries, selectedDate]
  )

  // Compute journal streak
  const journalStreak = useMemo(() => {
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = formatDateStr(d)
      const hasEntry = journalEntries.some(e => e.date === dateStr && e.content.trim().length > 0)
      if (hasEntry) {
        streak++
      } else {
        if (i === 0) continue
        break
      }
    }
    return streak
  }, [journalEntries])

  // Total entries
  const totalEntries = useMemo(
    () => journalEntries.filter(e => e.content.trim().length > 0).length,
    [journalEntries]
  )

  // Last 7 days with entry indicators
  const last7Days = useMemo(() => getLast7Days(), [])

  // Word count from current entry (or 0 if editing new)
  const wordCount = useMemo(() => getWordCount(currentEntry?.content ?? ''), [currentEntry])

  // Navigation handlers
  const goToDate = useCallback((dateStr: string) => {
    setSelectedDate(dateStr)
  }, [])

  const goPrev = useCallback(() => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    setSelectedDate(formatDateStr(d))
  }, [selectedDate])

  const goNext = useCallback(() => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    const tomorrow = formatDateStr(new Date())
    if (formatDateStr(d) <= tomorrow) {
      setSelectedDate(formatDateStr(d))
    }
  }, [selectedDate])

  const goToday = useCallback(() => {
    setSelectedDate(formatDateStr(new Date()))
  }, [])

  const isToday = selectedDate === formatDateStr(new Date())

  const handleDelete = useCallback(() => {
    if (currentEntry) {
      deleteJournalEntry(currentEntry.id)
    }
  }, [currentEntry, deleteJournalEntry])

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto custom-scrollbar">
      <motion.div
        className="space-y-5 p-4 md:p-6 max-w-4xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Header: Date Navigation ──────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                {/* Left: Navigation arrows */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goNext}
                    disabled={isToday}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Center: Date display */}
                <div className="flex items-center gap-2 text-center">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold">{formatDisplayDate(selectedDate)}</p>
                    <p className="text-[10px] text-muted-foreground">{formatFullDate(selectedDate)}</p>
                  </div>
                </div>

                {/* Right: Today button + Delete */}
                <div className="flex items-center gap-2">
                  {!isToday && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={goToday}
                    >
                      Today
                    </Button>
                  )}
                  {currentEntry && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={handleDelete}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete entry</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* 7-Day strip */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {last7Days.map((dateStr) => {
                  const hasEntry = journalEntries.some(e => e.date === dateStr && e.content.trim().length > 0)
                  const isSelected = dateStr === selectedDate
                  const isCurrentDay = dateStr === formatDateStr(new Date())
                  const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay()

                  return (
                    <Tooltip key={dateStr}>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={() => goToDate(dateStr)}
                          className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${
                            isSelected
                              ? 'bg-primary/10 ring-1 ring-primary/20'
                              : 'hover:bg-muted/50'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className={`text-[9px] leading-none ${
                            isSelected ? 'text-primary font-semibold' : 'text-muted-foreground/60'
                          }`}>
                            {DAY_LABELS_SHORT[dayOfWeek]}
                          </span>
                          <div className="relative">
                            <span className={`text-xs font-medium ${
                              isSelected ? 'text-primary' : isCurrentDay ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {new Date(dateStr + 'T00:00:00').getDate()}
                            </span>
                            {hasEntry && (
                              <motion.div
                                className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                              />
                            )}
                          </div>
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        {formatDisplayDate(dateStr)}{hasEntry ? ' · Has entry' : ''}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Stats Row ──────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-3 gap-3">
            {/* Streak */}
            <Card className="group hover:shadow-md transition-all duration-300">
              <CardContent className="p-3 md:p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                  <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Streak</p>
                  <p className="text-lg font-bold">{journalStreak} <span className="text-[10px] font-normal text-muted-foreground">days</span></p>
                </div>
              </CardContent>
            </Card>

            {/* Entries */}
            <Card className="group hover:shadow-md transition-all duration-300">
              <CardContent className="p-3 md:p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Entries</p>
                  <p className="text-lg font-bold">{totalEntries}</p>
                </div>
              </CardContent>
            </Card>

            {/* Words */}
            <Card className="group hover:shadow-md transition-all duration-300">
              <CardContent className="p-3 md:p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center shrink-0">
                  <Hash className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Words</p>
                  <p className="text-lg font-bold">{wordCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* ── Journal Editor (keyed by selectedDate for clean remount) ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <JournalEditor selectedDate={selectedDate} currentEntry={currentEntry} />
          </motion.div>
        </AnimatePresence>

        {/* ── Empty State (when no entries at all and on today) ──── */}
        {journalEntries.length === 0 && isToday && (
          <motion.div
            variants={itemVariants}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-dashed border-2 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4">
                  <PenLine className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">Start Your Journal</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  Take a moment each day to reflect on your thoughts, feelings, and what you&apos;re grateful for.
                  Writing just a few words can make a big difference.
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Track your mood</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Heart className="h-3 w-3 text-rose-500" />
                    <span>Practice gratitude</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-3 w-3 text-orange-500" />
                    <span>Build streaks</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
