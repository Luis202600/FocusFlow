'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Sun,
  Moon,
  CloudSun,
  CheckCircle2,
  Clock,
  Flame,
  ListTodo,
  CalendarClock,
  BookOpen,
  Target,
  ChevronRight,
  Sparkles,
  Trophy,
  Zap,
  ArrowRight,
  Plus,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  useAppStore,
  type Task,
  type Subject,
  type Habit,
  type StudySession,
  type TimeBlock,
} from '@/lib/store'

// ─── Constants ────────────────────────────────────────────────────────────────

const MOTIVATIONAL_QUOTES = [
  { text: 'Focus is the new superpower.', author: 'Cal Newport' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: "Don't watch the clock; do what it does. Keep going.", author: 'Sam Levenson' },
  { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
  { text: 'Small daily improvements over time lead to stunning results.', author: 'Robin Sharma' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Success is the sum of small efforts repeated day in and day out.', author: 'Robert Collier' },
  { text: 'Your future is created by what you do today, not tomorrow.', author: 'Robert Kiyosaki' },
]

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400',
}

const PRIORITY_BORDER_COLORS: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-gray-400',
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string; light: string; border: string }> = {
  study: {
    bg: 'bg-violet-100 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-500',
    light: 'bg-violet-500/10',
    border: 'border-violet-200 dark:border-violet-800',
  },
  work: {
    bg: 'bg-sky-100 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
    light: 'bg-sky-500/10',
    border: 'border-sky-200 dark:border-sky-800',
  },
  personal: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    light: 'bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  break: {
    bg: 'bg-gray-100 dark:bg-gray-800/40',
    text: 'text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400',
    light: 'bg-gray-500/10',
    border: 'border-gray-200 dark:border-gray-700',
  },
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}


function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function getTodayTasks(tasks: Task[]): Task[] {
  const today = getTodayStr()
  return tasks.filter((t) => t.dueDate === today)
}

function getTodayStudyHours(sessions: StudySession[]): number {
  const today = getTodayStr()
  return sessions
    .filter((s) => {
      if (!s.completed) return false
      const sessionDate = s.startedAt.split('T')[0]
      return sessionDate === today
    })
    .reduce((acc, s) => acc + s.duration, 0) / 60
}

function getMotivationalQuote(): { text: string; author: string } {
  const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
  return MOTIVATIONAL_QUOTES[idx]
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

function formatDuration(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  if (diff < 60) return `${diff}m`
  const hours = Math.floor(diff / 60)
  const mins = diff % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function isCurrentTimeBlock(block: TimeBlock): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = block.startTime.split(':').map(Number)
  const [eh, em] = block.endTime.split(':').map(Number)
  const start = sh * 60 + sm
  const end = eh * 60 + em
  return currentMinutes >= start && currentMinutes < end
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function getXpForLevel(level: number): number {
  return level * 100
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
}

// ─── Circular Progress Component ──────────────────────────────────────────────

function CircularProgress({
  value,
  max,
  size = 80,
  strokeWidth = 6,
  color = '#7c3aed',
}: {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percent = max > 0 ? Math.min(value / max, 1) : 0
  const offset = circumference - percent * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted-foreground/15"
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
        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
      />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardView() {
  const { tasks, subjects, habits, studySessions, timeBlocks, settings, setCurrentView, updateSettings } =
    useAppStore()

  const hasData = tasks.length > 0 || subjects.length > 0 || habits.length > 0 || timeBlocks.length > 0
  const isNewUser = !settings.onboardingDone

  // Memoized computed values
  const quote = useMemo(() => getMotivationalQuote(), [])
  const greetingHour = useMemo(() => new Date().getHours(), [])

  const todayTasks = useMemo(() => getTodayTasks(tasks), [tasks])
  const todayCompletedTasks = useMemo(
    () => todayTasks.filter((t) => t.completed || t.status === 'done'),
    [todayTasks]
  )
  const todayStudyHours = useMemo(
    () => getTodayStudyHours(studySessions),
    [studySessions]
  )

  const sortedTodayTasks = useMemo(
    () =>
      [...todayTasks]
        .filter((t) => !t.completed && t.status !== 'done')
        .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3))
        .slice(0, 5),
    [todayTasks]
  )

  const todayTimeBlocks = useMemo(() => {
    const today = getTodayStr()
    return timeBlocks
      .filter((b) => b.date === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [timeBlocks])

  const todayHabits = useMemo(() => {
    const today = getTodayStr()
    const dayOfWeek = new Date().getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isWeekday = !isWeekend

    return habits.filter((h) => {
      if (h.frequency === 'daily') return true
      if (h.frequency === 'weekdays') return isWeekday
      if (h.frequency === 'weekends') return isWeekend
      return true
    })
  }, [habits])

  const completedHabitsToday = useMemo(() => {
    const today = getTodayStr()
    return todayHabits.filter((h) =>
      h.logs.some((l) => l.date === today && l.completed)
    )
  }, [todayHabits])

  const xpProgress = useMemo(
    () => (getXpForLevel(settings.level) > 0 ? (settings.xp / getXpForLevel(settings.level)) * 100 : 0),
    [settings.xp, settings.level]
  )

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Top Row: Greeting + Quick Stats ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Greeting Card */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0djJoLTJ2LTJoMnptMC0yaDJ2MmgtMnYtMnptLTQgNHYyaC0ydi0yaDJ6bTQgMHYyaC0ydi0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            <CardContent className="relative p-6 md:p-8">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 text-white/80">
                    {greetingHour < 12 ? <Sun className="h-5 w-5" /> : greetingHour < 17 ? <CloudSun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    <span className="text-sm font-medium">{formatDate()}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {getGreeting()}{settings.name ? `, ${settings.name}` : ''} ✨
                  </h1>
                  <p className="text-white/70 text-sm md:text-base italic max-w-md">
                    &ldquo;{quote.text}&rdquo; — {quote.author}
                  </p>
                </div>
              </div>

              {/* XP Progress */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-300" />
                    <span className="font-medium">Level {settings.level}</span>
                  </div>
                  <span className="text-white/70">
                    {settings.xp} / {getXpForLevel(settings.level)} XP
                  </span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-400 to-amber-300 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 md:gap-4 h-full">
            {/* Tasks Completed */}
            <Card className="group hover:shadow-md transition-all duration-300 hover:border-violet-200 dark:hover:border-violet-800">
              <CardContent className="p-4 md:p-5 flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Tasks Done</p>
                  <p className="text-xl font-bold tracking-tight">
                    {todayCompletedTasks.length}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{todayTasks.length}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Study Hours */}
            <Card className="group hover:shadow-md transition-all duration-300 hover:border-sky-200 dark:hover:border-sky-800">
              <CardContent className="p-4 md:p-5 flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Study Hours</p>
                  <p className="text-xl font-bold tracking-tight">
                    {todayStudyHours.toFixed(1)}
                    <span className="text-sm font-normal text-muted-foreground"> hrs</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Streak */}
            <Card className="group hover:shadow-md transition-all duration-300 hover:border-orange-200 dark:hover:border-orange-800">
              <CardContent className="p-4 md:p-5 flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300">
                  <Flame className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Streak</p>
                  <p className="text-xl font-bold tracking-tight">
                    {settings.streak}
                    <span className="text-sm font-normal text-muted-foreground"> days</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* ── Onboarding Section (shown when no data) ──────────────────────── */}
      {(isNewUser || !hasData) && (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-2 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
            <CardContent className="p-6 md:p-8">
              <div className="text-center mb-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 mb-4">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-bold mb-2">
                  {isNewUser ? 'Welcome to FocusFlow' : 'Start Your Productivity Journey'}
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {isNewUser
                    ? 'Your personal productivity & study companion. Set up your workspace in seconds.'
                    : 'Add your first tasks, subjects, or habits to see your dashboard come alive.'
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl mx-auto">
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-center gap-2 hover:bg-violet-50 hover:border-violet-300 dark:hover:bg-violet-950/30 dark:hover:border-violet-700 transition-all group"
                  onClick={() => {
                    updateSettings({ onboardingDone: true })
                    setCurrentView('settings')
                  }}
                >
                  <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="text-xs font-medium">Set Your Name</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-center gap-2 hover:bg-sky-50 hover:border-sky-300 dark:hover:bg-sky-950/30 dark:hover:border-sky-700 transition-all group"
                  onClick={() => {
                    updateSettings({ onboardingDone: true })
                    setCurrentView('tasks')
                  }}
                >
                  <div className="h-8 w-8 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <span className="text-xs font-medium">Add Tasks</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-700 transition-all group"
                  onClick={() => {
                    updateSettings({ onboardingDone: true })
                    setCurrentView('study')
                  }}
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium">Add Subjects</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-center gap-2 hover:bg-amber-50 hover:border-amber-300 dark:hover:bg-amber-950/30 dark:hover:border-amber-700 transition-all group"
                  onClick={() => {
                    updateSettings({ onboardingDone: true })
                    setCurrentView('habits')
                  }}
                >
                  <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-medium">Track Habits</span>
                </Button>
              </div>

              {isNewUser && (
                <div className="mt-6 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => updateSettings({ onboardingDone: true })}
                  >
                    Skip setup for now
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Middle Row: Today's Priorities + Upcoming Schedule ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Today's Priorities */}
        <motion.div variants={itemVariants}>
          <Card className="h-full hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/50">
                    <ListTodo className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <CardTitle className="text-base">Today&apos;s Priorities</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => setCurrentView('tasks')}
                >
                  View all
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sortedTodayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mb-2 text-emerald-400" />
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs">No pending tasks for today</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {sortedTodayTasks.map((task, i) => {
                    const catColor = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.personal
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={`flex items-center gap-3 p-3 rounded-lg border-l-[3px] ${PRIORITY_BORDER_COLORS[task.priority]} bg-muted/30 hover:bg-muted/60 transition-colors duration-200 cursor-pointer group`}
                        onClick={() => setCurrentView('tasks')}
                      >
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_COLORS[task.priority]}`}
                        />
                        <span className="text-sm font-medium truncate flex-1 group-hover:text-foreground transition-colors">
                          {task.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 h-5 ${catColor.bg} ${catColor.text} border-0`}
                        >
                          {task.category}
                        </Badge>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Schedule */}
        <motion.div variants={itemVariants}>
          <Card className="h-full hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950/50">
                    <CalendarClock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <CardTitle className="text-base">Upcoming Schedule</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => setCurrentView('planner')}
                >
                  Planner
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {todayTimeBlocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CalendarClock className="h-10 w-10 mb-2 text-sky-300" />
                  <p className="text-sm font-medium">Nothing scheduled</p>
                  <p className="text-xs">Plan your day in the planner</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {todayTimeBlocks.map((block, i) => {
                    const catColor = CATEGORY_COLORS[block.category] || CATEGORY_COLORS.personal
                    const isCurrent = isCurrentTimeBlock(block)
                    return (
                      <motion.div
                        key={block.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 ${
                          isCurrent
                            ? `${catColor.light} ring-1 ${catColor.border}`
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        {/* Time indicator */}
                        <div className="w-[72px] shrink-0 text-right">
                          <span
                            className={`text-xs font-mono ${
                              isCurrent
                                ? `${catColor.text} font-bold`
                                : 'text-muted-foreground'
                            }`}
                          >
                            {formatTime(block.startTime)}
                          </span>
                        </div>

                        {/* Category dot + line */}
                        <div className="flex flex-col items-center gap-0.5 shrink-0">
                          <span className={`h-2.5 w-2.5 rounded-full ${catColor.dot}`} />
                          {i < todayTimeBlocks.length - 1 && (
                            <span className="w-px h-4 bg-border" />
                          )}
                        </div>

                        {/* Block info */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className={`text-sm font-medium truncate ${
                              isCurrent ? catColor.text : ''
                            } ${block.completed ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {block.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatDuration(block.startTime, block.endTime)}
                          </span>
                        </div>

                        {/* Current indicator */}
                        {isCurrent && (
                          <span className="flex items-center gap-1 shrink-0">
                            <span className="relative flex h-2 w-2">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${catColor.dot} opacity-75`} />
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${catColor.dot}`} />
                            </span>
                            <span className={`text-[10px] font-semibold ${catColor.text}`}>NOW</span>
                          </span>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Bottom Row: Subject Progress + Habit Summary ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Subject Progress */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
                    <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-base">Subject Progress</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => setCurrentView('study')}
                >
                  Study
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mb-2 text-emerald-300" />
                  <p className="text-sm font-medium">No subjects yet</p>
                  <p className="text-xs">Add subjects to track your progress</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                  {subjects.map((subject, i) => (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="group cursor-pointer"
                      onClick={() => setCurrentView('study')}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-3 w-3 rounded-sm shrink-0"
                            style={{ backgroundColor: subject.color }}
                          />
                          <span className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                            {subject.name}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {subject.topics.length} topic{subject.topics.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span
                          className="text-sm font-bold tabular-nums shrink-0 ml-2"
                          style={{ color: subject.color }}
                        >
                          {subject.progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: subject.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${subject.progress}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 + i * 0.1 }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Habit Summary */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/50">
                    <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardTitle className="text-base">Habit Summary</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => setCurrentView('habits')}
                >
                  Habits
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {todayHabits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Target className="h-10 w-10 mb-2 text-amber-300" />
                  <p className="text-sm font-medium">No habits yet</p>
                  <p className="text-xs">Start building good habits</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  {/* Circular Progress */}
                  <div className="relative shrink-0 cursor-pointer" onClick={() => setCurrentView('habits')}>
                    <CircularProgress
                      value={completedHabitsToday.length}
                      max={todayHabits.length}
                      size={100}
                      strokeWidth={8}
                      color="#f59e0b"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold">
                        {completedHabitsToday.length}/{todayHabits.length}
                      </span>
                      <span className="text-[10px] text-muted-foreground">done</span>
                    </div>
                  </div>

                  {/* Habit List */}
                  <div className="flex-1 space-y-2 min-w-0 max-h-32 overflow-y-auto custom-scrollbar">
                    {todayHabits.map((habit, i) => {
                      const today = getTodayStr()
                      const isCompleted = habit.logs.some(
                        (l) => l.date === today && l.completed
                      )
                      return (
                        <motion.div
                          key={habit.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-center gap-2"
                        >
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              isCompleted ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                            }`}
                          />
                          <span
                            className={`text-sm truncate ${
                              isCompleted
                                ? 'text-muted-foreground line-through'
                                : 'font-medium'
                            }`}
                          >
                            {habit.name}
                          </span>
                          {isCompleted && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 ml-auto" />
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Motivational Footer ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-4 flex items-center justify-center gap-3 text-muted-foreground">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <p className="text-xs">
              <Zap className="inline h-3 w-3 text-amber-500 mr-1" />
              Complete tasks and study sessions to earn XP and level up!
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
