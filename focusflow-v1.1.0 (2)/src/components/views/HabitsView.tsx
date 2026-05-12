'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import {
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Flame,
  Trophy,
  Target,
  Sparkles,
  Check,
  Sunrise,
  Dumbbell,
  BookOpen,
  Brain,
  Heart,
  Music,
  Coffee,
  Pen,
  X,
  TrendingUp,
  CalendarDays,
  Star,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { useAppStore, type Habit, type HabitLog } from '@/lib/store'

// ─── Constants ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sunrise,
  Dumbbell,
  BookOpen,
  Brain,
  Heart,
  Music,
  Coffee,
  Pen,
}

const ICON_OPTIONS = [
  { name: 'Sunrise', label: 'Morning' },
  { name: 'Dumbbell', label: 'Exercise' },
  { name: 'BookOpen', label: 'Reading' },
  { name: 'Brain', label: 'Mindfulness' },
  { name: 'Heart', label: 'Wellness' },
  { name: 'Music', label: 'Music' },
  { name: 'Coffee', label: 'Break' },
  { name: 'Pen', label: 'Writing' },
]

const COLOR_OPTIONS = [
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Sky', hex: '#0ea5e9' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Pink', hex: '#ec4899' },
]

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  custom: 'Custom',
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function getLast7Days(): string[] {
  const days: string[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function getLast28Days(): string[] {
  const days: string[] = []
  const today = new Date()
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function isHabitDueToday(habit: Habit): boolean {
  const today = new Date().getDay() // 0=Sun, 1=Mon, ...
  switch (habit.frequency) {
    case 'daily':
      return true
    case 'weekdays':
      return today >= 1 && today <= 5
    case 'weekends':
      return today === 0 || today === 6
    case 'custom':
      return true
    default:
      return true
  }
}

function getStreak(habit: Habit): number {
  let streak = 0
  const today = new Date()
  // Start checking from today
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const log = habit.logs.find(l => l.date === dateStr)
    if (log?.completed) {
      streak++
    } else {
      // Allow today to be incomplete without breaking streak
      if (i === 0) continue
      break
    }
  }
  return streak
}

function getBestStreak(habit: Habit): number {
  const sortedLogs = [...habit.logs]
    .filter(l => l.completed)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (sortedLogs.length === 0) return 0

  let best = 1
  let current = 1

  for (let i = 1; i < sortedLogs.length; i++) {
    const prevDate = new Date(sortedLogs[i - 1].date + 'T00:00:00')
    const currDate = new Date(sortedLogs[i].date + 'T00:00:00')
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      current++
      best = Math.max(best, current)
    } else {
      current = 1
    }
  }

  return best
}

function getCompletionRate(habit: Habit, days: number): number {
  const today = new Date()
  let dueDays = 0
  let completedDays = 0

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayOfWeek = d.getDay()

    let isDue = false
    switch (habit.frequency) {
      case 'daily': isDue = true; break
      case 'weekdays': isDue = dayOfWeek >= 1 && dayOfWeek <= 5; break
      case 'weekends': isDue = dayOfWeek === 0 || dayOfWeek === 6; break
      case 'custom': isDue = true; break
    }

    if (isDue) {
      dueDays++
      const log = habit.logs.find(l => l.date === dateStr)
      if (log?.completed) completedDays++
    }
  }

  return dueDays === 0 ? 0 : Math.round((completedDays / dueDays) * 100)
}

function isLogCompletedForDate(habit: Habit, dateStr: string): boolean {
  const log = habit.logs.find(l => l.date === dateStr)
  return log?.completed ?? false
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 25 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
}

const celebrationVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: { duration: 0.3 },
  },
}

// ─── Circular Progress ────────────────────────────────────────────────────────

function CircularProgress({
  value,
  max,
  size = 80,
  strokeWidth = 6,
  color = '#10b981',
}: {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = max > 0 ? value / max : 0
  const offset = circumference - progress * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none">{value}</span>
        <span className="text-[10px] text-muted-foreground">/ {max}</span>
      </div>
    </div>
  )
}

// ─── Celebration Overlay ──────────────────────────────────────────────────────

function CelebrationOverlay({ show }: { show: boolean }) {
  if (!show) return null

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 1.5,
    emoji: ['🎉', '✨', '🌟', '⭐', '🎊', '💫'][Math.floor(Math.random() * 6)],
    size: 14 + Math.random() * 12,
  }))

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute"
              style={{
                left: `${p.x}%`,
                fontSize: p.size,
              }}
              initial={{ y: '100vh', opacity: 0, scale: 0 }}
              animate={{
                y: '-20vh',
                opacity: [0, 1, 1, 0],
                scale: [0, 1.2, 1, 0.5],
                x: [0, (Math.random() - 0.5) * 100],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: 'easeOut',
              }}
            >
              {p.emoji}
            </motion.div>
          ))}

          {/* Center badge */}
          <motion.div
            variants={celebrationVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col items-center gap-3 bg-card/95 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-2xl border"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 0.6, repeat: 2 }}
            >
              <Trophy className="h-12 w-12 text-amber-500" />
            </motion.div>
            <h2 className="text-xl font-bold">Perfect Day!</h2>
            <p className="text-sm text-muted-foreground text-center">
              All habits completed. You&apos;re on fire! 🔥
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Add/Edit Habit Dialog ────────────────────────────────────────────────────

interface HabitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingHabit: Habit | null
}

function HabitDialog({ open, onOpenChange, editingHabit }: HabitDialogProps) {
  const { addHabit, updateHabit } = useAppStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLOR_OPTIONS[0].hex)
  const [icon, setIcon] = useState('Sunrise')
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'weekends' | 'custom'>('daily')
  const [targetCount, setTargetCount] = useState(1)

  const resetForm = useCallback(() => {
    if (editingHabit) {
      setName(editingHabit.name)
      setColor(editingHabit.color)
      setIcon(editingHabit.icon || 'Sunrise')
      setFrequency(editingHabit.frequency)
      setTargetCount(editingHabit.targetCount)
    } else {
      setName('')
      setColor(COLOR_OPTIONS[0].hex)
      setIcon('Sunrise')
      setFrequency('daily')
      setTargetCount(1)
    }
  }, [editingHabit])

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) resetForm()
    onOpenChange(newOpen)
  }

  const handleSubmit = () => {
    if (!name.trim()) return

    if (editingHabit) {
      updateHabit(editingHabit.id, {
        name: name.trim(),
        color,
        icon,
        frequency,
        targetCount,
      })
    } else {
      addHabit({
        name: name.trim(),
        color,
        icon,
        frequency,
        targetCount,
      })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingHabit ? 'Edit Habit' : 'New Habit'}</DialogTitle>
          <DialogDescription>
            {editingHabit ? 'Update your habit details' : 'Build a new positive habit'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Habit Name <span className="text-red-500">*</span></label>
            <Input
              placeholder="e.g., Morning Study, Exercise, Read 30 min..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) handleSubmit()
              }}
              autoFocus
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Icon</label>
            <div className="grid grid-cols-4 gap-2">
              {ICON_OPTIONS.map((opt) => {
                const IconComp = ICON_MAP[opt.name]
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setIcon(opt.name)}
                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                      icon === opt.name
                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                        : 'border-border hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {IconComp && <IconComp className="h-5 w-5" />}
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`h-8 w-8 rounded-full transition-all relative ${
                    color === c.hex
                      ? 'ring-2 ring-offset-2 ring-offset-background scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex, ringColor: c.hex }}
                  title={c.name}
                >
                  {color === c.hex && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Check className="h-4 w-4 text-white drop-shadow-sm" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Frequency</label>
            <div className="grid grid-cols-2 gap-2">
              {(['daily', 'weekdays', 'weekends', 'custom'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    frequency === f
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'border-border hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {FREQUENCY_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Target Count */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Daily Target</label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setTargetCount(Math.max(1, targetCount - 1))}
              >
                -
              </Button>
              <span className="text-lg font-semibold w-8 text-center">{targetCount}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setTargetCount(targetCount + 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: color + '20' }}
              >
                {(() => {
                  const IconComp = ICON_MAP[icon]
                  return IconComp ? <IconComp className="h-4 w-4" style={{ color }} /> : null
                })()}
              </div>
              <div>
                <p className="text-sm font-medium">{name || 'Habit Name'}</p>
                <p className="text-xs text-muted-foreground">{FREQUENCY_LABELS[frequency]} · {targetCount}x per day</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {editingHabit ? 'Save Changes' : 'Create Habit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Weekly Heatmap Row ───────────────────────────────────────────────────────

function WeeklyHeatmap({ habit }: { habit: Habit }) {
  const days = getLast7Days()
  const today = getTodayStr()

  return (
    <div className="flex items-center gap-1">
      {days.map((dateStr, i) => {
        const completed = isLogCompletedForDate(habit, dateStr)
        const isToday = dateStr === today
        const isFuture = dateStr > today

        return (
          <Tooltip key={dateStr}>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] text-muted-foreground/60 leading-none">
                  {DAY_LABELS[i]}
                </span>
                <motion.div
                  className={`h-3.5 w-3.5 rounded-full transition-colors ${
                    isFuture ? 'opacity-20' : ''
                  }`}
                  style={{
                    backgroundColor: completed ? habit.color : undefined,
                    border: completed ? 'none' : `1.5px solid ${isToday ? habit.color : 'currentColor'}`,
                    opacity: isFuture ? 0.15 : completed ? 0.85 : 0.25,
                  }}
                  whileHover={{ scale: 1.3 }}
                  whileTap={{ scale: 0.9 }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {dateStr}{completed ? ' ✓' : isFuture ? ' (future)' : ' ✗'}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

// ─── Habit Checkbox ───────────────────────────────────────────────────────────

function HabitCheckbox({
  completed,
  color,
  onToggle,
}: {
  completed: boolean
  color: string
  onToggle: () => void
}) {
  return (
    <motion.button
      onClick={onToggle}
      className={`relative h-9 w-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
        completed
          ? ''
          : 'border-2 hover:border-opacity-80'
      }`}
      style={{
        backgroundColor: completed ? color : 'transparent',
        borderColor: completed ? 'transparent' : color,
      }}
      whileTap={{ scale: 0.85 }}
      animate={completed ? { scale: [1, 1.15, 1] } : {}}
      transition={completed ? { duration: 0.3 } : {}}
    >
      <AnimatePresence mode="wait">
        {completed ? (
          <motion.div
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Check className="h-5 w-5 text-white" strokeWidth={3} />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ─── Habit Detail Panel ───────────────────────────────────────────────────────

function HabitDetailPanel({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const last28Days = getLast28Days()
  const last7Days = getLast7Days()
  const streak = getStreak(habit)
  const bestStreak = getBestStreak(habit)
  const completionRate = getCompletionRate(habit, 7)
  const completionRate28 = getCompletionRate(habit, 28)

  // Completion data for last 7 days bar chart
  const barData = last7Days.map((dateStr) => {
    const completed = isLogCompletedForDate(habit, dateStr)
    return { date: dateStr, completed }
  })

  // Group 28 days into weeks for calendar heatmap
  const weeks: string[][] = []
  for (let i = 0; i < 28; i += 7) {
    weeks.push(last28Days.slice(i, i + 7))
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <Card className="border-t-0 rounded-t-none shadow-none">
        <CardContent className="p-4 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: habit.color + '20' }}
              >
                {(() => {
                  const IconComp = ICON_MAP[habit.icon || 'Sunrise']
                  return IconComp ? <IconComp className="h-5 w-5" style={{ color: habit.color }} /> : null
                })()}
              </div>
              <div>
                <h3 className="font-semibold">{habit.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {FREQUENCY_LABELS[habit.frequency]} · Target: {habit.targetCount}x/day
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/40">
              <p className="text-lg font-bold" style={{ color: habit.color }}>{streak}</p>
              <p className="text-[10px] text-muted-foreground">Current Streak</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/40">
              <p className="text-lg font-bold text-amber-500">{bestStreak}</p>
              <p className="text-[10px] text-muted-foreground">Best Streak</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/40">
              <p className="text-lg font-bold text-emerald-500">{completionRate}%</p>
              <p className="text-[10px] text-muted-foreground">7-Day Rate</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/40">
              <p className="text-lg font-bold text-sky-500">{completionRate28}%</p>
              <p className="text-[10px] text-muted-foreground">28-Day Rate</p>
            </div>
          </div>

          {/* Monthly Calendar Heatmap (GitHub-style) */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last 28 Days</h4>
            <div className="flex gap-2">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((dateStr) => {
                    const completed = isLogCompletedForDate(habit, dateStr)
                    const isToday = dateStr === getTodayStr()
                    return (
                      <Tooltip key={dateStr}>
                        <TooltipTrigger asChild>
                          <motion.div
                            className={`h-4 w-4 rounded-[3px] ${
                              isToday ? 'ring-1 ring-offset-1 ring-offset-background' : ''
                            }`}
                            style={{
                              backgroundColor: completed ? habit.color : 'currentColor',
                              opacity: completed ? 0.85 : 0.08,
                              ringColor: isToday ? habit.color : undefined,
                            }}
                            whileHover={{ scale: 1.4 }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: wi * 0.05 + week.indexOf(dateStr) * 0.01 }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {dateStr}{completed ? ' ✓' : ' ✗'}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-[9px] text-muted-foreground">Less</span>
              {[0.08, 0.3, 0.55, 0.85].map((opacity, i) => (
                <div
                  key={i}
                  className="h-3 w-3 rounded-[2px]"
                  style={{ backgroundColor: habit.color, opacity }}
                />
              ))}
              <span className="text-[9px] text-muted-foreground">More</span>
            </div>
          </div>

          {/* Last 7 Days Bar Chart */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last 7 Days</h4>
            <div className="flex items-end gap-2 h-20">
              {barData.map((d, i) => {
                const isToday = d.date === getTodayStr()
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      className="w-full rounded-t-md"
                      style={{
                        backgroundColor: d.completed ? habit.color : 'currentColor',
                        opacity: d.completed ? 0.75 : 0.08,
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: d.completed ? '100%' : '12%' }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                    />
                    <span className={`text-[9px] leading-none ${isToday ? 'font-bold text-foreground' : 'text-muted-foreground/60'}`}>
                      {DAY_LABELS[i]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Habit Card ───────────────────────────────────────────────────────────────

interface HabitCardProps {
  habit: Habit
  isExpanded: boolean
  onToggleExpand: () => void
  onToggleLog: () => void
  onEdit: () => void
  onDelete: () => void
}

function HabitCard({ habit, isExpanded, onToggleExpand, onToggleLog, onEdit, onDelete }: HabitCardProps) {
  const streak = getStreak(habit)
  const today = getTodayStr()
  const todayCompleted = isLogCompletedForDate(habit, today)
  const dueToday = isHabitDueToday(habit)

  const IconComp = ICON_MAP[habit.icon || 'Sunrise']

  return (
    <motion.div
      layout
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="group"
    >
      <Card
        className={`border transition-all duration-200 cursor-pointer overflow-hidden ${
          todayCompleted
            ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/10'
            : 'hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20'
        } ${isExpanded ? 'rounded-b-none border-b-0' : ''}`}
        onClick={onToggleExpand}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            {/* Color dot / Icon */}
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
              style={{ backgroundColor: habit.color + (todayCompleted ? '30' : '15') }}
            >
              {IconComp ? (
                <IconComp
                  className="h-4 w-4 transition-colors"
                  style={{ color: habit.color }}
                />
              ) : (
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: habit.color }}
                />
              )}
            </div>

            {/* Name + Frequency */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium truncate ${todayCompleted ? 'line-through text-muted-foreground' : ''}`}>
                  {habit.name}
                </p>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-[18px] border-0 shrink-0 bg-muted/60"
                >
                  {FREQUENCY_LABELS[habit.frequency]}
                </Badge>
              </div>
            </div>

            {/* Weekly Heatmap - hidden on very small screens */}
            <div className="hidden md:flex">
              <WeeklyHeatmap habit={habit} />
            </div>

            {/* Streak Badge */}
            {streak > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className="text-[10px] px-1.5 py-0 h-[20px] border-0 shrink-0 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 cursor-pointer"
                  >
                    🔥 {streak}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{streak} day streak</TooltipContent>
              </Tooltip>
            )}

            {/* Today's Checkbox */}
            {dueToday && (
              <div onClick={(e) => e.stopPropagation()}>
                <HabitCheckbox
                  completed={todayCompleted}
                  color={habit.color}
                  onToggle={onToggleLog}
                />
              </div>
            )}

            {/* Expand / Edit / Delete */}
            <div className="flex items-center gap-0.5 shrink-0">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit()
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </div>
          </div>

          {/* Mobile Weekly Heatmap */}
          <div className="flex md:hidden mt-2 pl-12">
            <WeeklyHeatmap habit={habit} />
          </div>

          {/* Completion animation effect */}
          <AnimatePresence>
            {todayCompleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                className="flex items-center gap-1.5 mt-2 pl-12"
              >
                <Sparkles className="h-3 w-3" style={{ color: habit.color }} />
                <span className="text-[10px] font-medium" style={{ color: habit.color }}>
                  Completed today!
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Detail Panel */}
      <AnimatePresence>
        {isExpanded && (
          <HabitDetailPanel habit={habit} onClose={onToggleExpand} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Summary Stats ────────────────────────────────────────────────────────────

function HabitSummaryStats({
  habits,
  settings,
}: {
  habits: Habit[]
  settings: { level: number; xp: number; streak: number }
}) {
  const today = getTodayStr()

  const dueHabits = useMemo(() => habits.filter(h => isHabitDueToday(h)), [habits])
  const completedToday = useMemo(
    () => dueHabits.filter(h => isLogCompletedForDate(h, today)).length,
    [dueHabits, today]
  )
  const totalDue = dueHabits.length

  const bestStreak = useMemo(() => {
    if (habits.length === 0) return 0
    return Math.max(...habits.map(h => getBestStreak(h)))
  }, [habits])

  const weeklyCompletionRate = useMemo(() => {
    if (habits.length === 0) return 0
    const rates = habits.map(h => getCompletionRate(h, 7))
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
  }, [habits])

  const allCompletedToday = totalDue > 0 && completedToday === totalDue

  // XP progress to next level
  const xpPerLevel = 100
  const xpInLevel = settings.xp % xpPerLevel
  const xpProgress = (xpInLevel / xpPerLevel) * 100

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Today's Progress */}
      <Card className="col-span-2 lg:col-span-1">
        <CardContent className="p-4 flex items-center gap-4">
          <CircularProgress
            value={completedToday}
            max={totalDue}
            size={72}
            strokeWidth={5}
            color={allCompletedToday ? '#10b981' : '#f59e0b'}
          />
          <div>
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-sm font-semibold">
              {completedToday}/{totalDue} habits
            </p>
            {allCompletedToday && totalDue > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1 mt-1"
              >
                <Star className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">All done!</span>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Best Streak */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Best Streak</p>
            <p className="text-lg font-bold">{bestStreak} <span className="text-xs font-normal text-muted-foreground">days</span></p>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Rate */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">7-Day Rate</p>
            <p className="text-lg font-bold">{weeklyCompletionRate}<span className="text-xs font-normal text-muted-foreground">%</span></p>
          </div>
        </CardContent>
      </Card>

      {/* Level */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Level {settings.level}</p>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={xpProgress} className="h-1.5 flex-1" />
              <span className="text-[10px] text-muted-foreground shrink-0">{xpInLevel}/{xpPerLevel} XP</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <Target className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No habits yet</h3>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
        Start building positive routines by creating your first habit.
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Create Your First Habit
      </Button>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HabitsView() {
  const { habits, addHabit, updateHabit, deleteHabit, toggleHabitLog, settings, tasks, addXP } = useAppStore()

  // State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const today = getTodayStr()

  // Calculate today's completion
  const dueHabits = useMemo(() => habits.filter(h => isHabitDueToday(h)), [habits])
  const completedToday = useMemo(
    () => dueHabits.filter(h => isLogCompletedForDate(h, today)).length,
    [dueHabits, today]
  )
  const allCompletedToday = dueHabits.length > 0 && completedToday === dueHabits.length

  // Check for all tasks done too (for Perfect Day badge)
  const allTasksDone = useMemo(() => {
    const todayTasks = tasks.filter(t => t.dueDate === today)
    return todayTasks.length > 0 && todayTasks.every(t => t.completed)
  }, [tasks, today])

  const isPerfectDay = allCompletedToday && allTasksDone

  // Track previous completion state for celebration
  const prevAllCompletedRef = useRef(false)
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handlers
  const handleToggleLog = useCallback((habitId: string) => {
    // Check if the habit was not completed before toggling
    const habit = habits.find(h => h.id === habitId)
    const wasCompleted = habit?.logs.some(l => l.date === today && l.completed)
    
    toggleHabitLog(habitId, today)
    
    // Award XP when completing a habit (not when un-completing)
    if (!wasCompleted) addXP(5)

    // Check if this toggle completes all habits - trigger celebration
    // We need to check the state after the toggle, so we use a microtask
    queueMicrotask(() => {
      const updatedHabits = useAppStore.getState().habits
      const updatedDue = updatedHabits.filter(h => isHabitDueToday(h))
      const updatedCompleted = updatedDue.filter(h => isLogCompletedForDate(h, today)).length
      const nowAllCompleted = updatedDue.length > 0 && updatedCompleted === updatedDue.length
      if (nowAllCompleted && !prevAllCompletedRef.current) {
        setShowCelebration(true)
        if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current)
        celebrationTimerRef.current = setTimeout(() => setShowCelebration(false), 3500)
      }
      prevAllCompletedRef.current = nowAllCompleted
    })
  }, [toggleHabitLog, today, habits, addXP])

  const handleEdit = useCallback((habit: Habit) => {
    setEditingHabit(habit)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback((id: string) => {
    setDeleteConfirmId(id)
  }, [])

  const confirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      deleteHabit(deleteConfirmId)
      if (expandedHabitId === deleteConfirmId) {
        setExpandedHabitId(null)
      }
      setDeleteConfirmId(null)
    }
  }, [deleteConfirmId, deleteHabit, expandedHabitId])

  const handleAdd = useCallback(() => {
    setEditingHabit(null)
    setDialogOpen(true)
  }, [])

  const handleToggleExpand = useCallback((habitId: string) => {
    setExpandedHabitId(prev => prev === habitId ? null : habitId)
  }, [])

  // Sort habits: incomplete first, then completed
  const sortedHabits = useMemo(() => {
    return [...habits].sort((a, b) => {
      const aCompleted = isLogCompletedForDate(a, today) && isHabitDueToday(a)
      const bCompleted = isLogCompletedForDate(b, today) && isHabitDueToday(b)
      if (aCompleted !== bCompleted) return aCompleted ? 1 : -1
      return a.createdAt.localeCompare(b.createdAt)
    })
  }, [habits, today])

  return (
    <motion.div
      className="flex flex-col h-full min-h-0"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" />
            Habits
            {isPerfectDay && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-sm font-normal"
              >
                🌟 Perfect Day
              </motion.span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Build consistency, one day at a time
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Habit</span>
        </Button>
      </div>

      {/* ── Summary Stats ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="mb-4">
        <HabitSummaryStats habits={habits} settings={settings} />
      </motion.div>

      {/* ── Habit List ─────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0">
        {habits.length === 0 ? (
          <EmptyState onAdd={handleAdd} />
        ) : (
          <motion.div
            className="space-y-2 px-1 pb-4"
            variants={containerVariants}
          >
            <AnimatePresence mode="popLayout">
              {sortedHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  isExpanded={expandedHabitId === habit.id}
                  onToggleExpand={() => handleToggleExpand(habit.id)}
                  onToggleLog={() => handleToggleLog(habit.id)}
                  onEdit={() => handleEdit(habit)}
                  onDelete={() => handleDelete(habit.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </ScrollArea>

      {/* ── Dialog ─────────────────────────────────────────────────── */}
      <HabitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingHabit={editingHabit}
      />

      {/* ── Delete Confirmation ────────────────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Habit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this habit? This action cannot be undone and all tracking data will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Celebration ────────────────────────────────────────────── */}
      <CelebrationOverlay show={showCelebration} />
    </motion.div>
  )
}
