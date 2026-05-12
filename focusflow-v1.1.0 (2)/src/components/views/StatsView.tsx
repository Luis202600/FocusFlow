'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  Target,
  BarChart3,
  Brain,
  Flame,
  Activity,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  useAppStore,
  type Task,
  type Subject,
  type Habit,
  type StudySession,
} from '@/lib/store'

// ─── Animation Variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
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

// ─── Color Palette ─────────────────────────────────────────────────────────────

const VIOLET_SCALE = [
  'oklch(0.92 0.04 293)',   // lightest
  'oklch(0.75 0.12 293)',
  'oklch(0.60 0.20 293)',
  'oklch(0.48 0.22 293)',
  'oklch(0.38 0.22 293)',   // darkest
]

const HEATMAP_COLORS = [
  'oklch(0.93 0.02 293 / 40%)',
  'oklch(0.75 0.12 293 / 60%)',
  'oklch(0.60 0.20 293 / 75%)',
  'oklch(0.48 0.22 293 / 85%)',
  'oklch(0.38 0.22 293)',
]

const SUBJECT_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

// ─── Chart Configs ─────────────────────────────────────────────────────────────

const weeklyStudyConfig = {
  hours: {
    label: 'Hours',
    color: 'oklch(0.541 0.189 293)',
  },
} satisfies ChartConfig

const taskTrendConfig = {
  completed: {
    label: 'Completed',
    color: 'oklch(0.541 0.189 293)',
  },
} satisfies ChartConfig

const hourlyDistConfig = {
  sessions: {
    label: 'Sessions',
    color: 'oklch(0.541 0.189 293)',
  },
} satisfies ChartConfig

// ─── Data Calculation Helpers ──────────────────────────────────────────────────

function getStudyHoursByDay(
  sessions: StudySession[],
  days: number
): { date: string; label: string; hours: number }[] {
  const result: { date: string; label: string; hours: number }[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    const hours = sessions
      .filter((s) => {
        if (!s.completed) return false
        const sessionDate = s.startedAt.split('T')[0]
        return sessionDate === dateStr
      })
      .reduce((acc, s) => acc + s.duration, 0) / 60

    result.push({
      date: dateStr,
      label: days <= 7 ? dayLabel : monthDay,
      hours: Math.round(hours * 100) / 100,
    })
  }

  return result
}

function getTasksCompletedByDay(
  tasks: Task[],
  days: number
): { date: string; label: string; completed: number }[] {
  const result: { date: string; label: string; completed: number }[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    const completed = tasks.filter((t) => {
      const taskDate = (t.completed ? t.updatedAt : t.dueDate)?.split('T')[0]
      return taskDate === dateStr && t.completed
    }).length

    result.push({
      date: dateStr,
      label: days <= 7 ? dayLabel : monthDay,
      completed,
    })
  }

  return result
}

function getSubjectHours(
  subjects: Subject[],
  sessions: StudySession[]
): { id: string; name: string; color: string; hours: number; topicsCompleted: number; topicsTotal: number }[] {
  return subjects.map((subject, idx) => {
    const hours = sessions
      .filter((s) => {
        if (!s.completed) return false
        return s.subjectId === subject.id || s.subjectName === subject.name
      })
      .reduce((acc, s) => acc + s.duration, 0) / 60

    const topicsCompleted = subject.topics.filter((t) => t.completed).length
    const topicsTotal = subject.topics.length

    return {
      id: subject.id,
      name: subject.name,
      color: subject.color || SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
      hours: Math.round(hours * 100) / 100,
      topicsCompleted,
      topicsTotal,
    }
  })
}

function getHourlyDistribution(
  sessions: StudySession[]
): { hour: string; sessions: number; isPeak: boolean }[] {
  const hourCounts: Record<number, number> = {}

  for (let h = 6; h <= 22; h++) {
    hourCounts[h] = 0
  }

  sessions.forEach((s) => {
    if (!s.completed) return
    const startHour = new Date(s.startedAt).getHours()
    if (startHour >= 6 && startHour <= 22) {
      hourCounts[startHour] = (hourCounts[startHour] || 0) + 1
    }
  })

  const maxSessions = Math.max(...Object.values(hourCounts), 0)
  const peakThreshold = maxSessions * 0.7

  return Object.entries(hourCounts).map(([h, count]) => {
    const hour = parseInt(h)
    const ampm = hour < 12 ? 'am' : 'pm'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return {
      hour: `${displayHour}${ampm}`,
      sessions: count,
      isPeak: count >= peakThreshold && count > 0,
    }
  })
}

interface HeatmapDay {
  date: string
  hours: number
  intensity: number // 0-4
  dayOfWeek: number // 0=Sun, 1=Mon...
  weekIndex: number
  monthLabel?: string
}

function getHeatmapData(
  sessions: StudySession[],
  weeks: number
): HeatmapDay[] {
  const result: HeatmapDay[] = []
  const now = new Date()
  const totalDays = weeks * 7

  // Calculate hours per day
  const dayHours: Record<string, number> = {}
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    dayHours[dateStr] = 0
  }

  sessions.forEach((s) => {
    if (!s.completed) return
    const sessionDate = s.startedAt.split('T')[0]
    if (dayHours[sessionDate] !== undefined) {
      dayHours[sessionDate] += s.duration / 60
    }
  })

  const maxHours = Math.max(...Object.values(dayHours), 0.1)

  // Build the grid
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const hours = dayHours[dateStr] || 0

    let intensity = 0
    if (hours > 0) {
      const ratio = hours / maxHours
      if (ratio <= 0.25) intensity = 1
      else if (ratio <= 0.5) intensity = 2
      else if (ratio <= 0.75) intensity = 3
      else intensity = 4
    }

    const dayOfWeek = d.getDay()
    const weekIndex = Math.floor((totalDays - 1 - i) / 7)

    // Add month label for first day of each month in the grid
    const prevDay = new Date(d)
    prevDay.setDate(prevDay.getDate() - 1)
    const monthLabel = d.getDate() <= 7 || prevDay.getMonth() !== d.getMonth()
      ? d.toLocaleDateString('en-US', { month: 'short' })
      : undefined

    result.push({
      date: dateStr,
      hours: Math.round(hours * 100) / 100,
      intensity,
      dayOfWeek,
      weekIndex,
      monthLabel,
    })
  }

  return result
}

function getHabitConsistency(habits: Habit[]): number {
  if (habits.length === 0) return 0
  const now = new Date()
  const last7Days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    last7Days.push(d.toISOString().split('T')[0])
  }

  let totalPossible = 0
  let totalCompleted = 0

  habits.forEach((habit) => {
    last7Days.forEach((date) => {
      const dayOfWeek = new Date(date).getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isWeekday = !isWeekend

      let applies = false
      if (habit.frequency === 'daily') applies = true
      else if (habit.frequency === 'weekdays') applies = isWeekday
      else if (habit.frequency === 'weekends') applies = isWeekend
      else applies = true

      if (applies) {
        totalPossible++
        const log = habit.logs.find((l) => l.date === date && l.completed)
        if (log) totalCompleted++
      }
    })
  })

  return totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0
}

function getAvgDailyFocus(sessions: StudySession[]): number {
  const now = new Date()
  const last7Days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    last7Days.push(d.toISOString().split('T')[0])
  }

  const totalHours = sessions
    .filter((s) => {
      if (!s.completed) return false
      const sessionDate = s.startedAt.split('T')[0]
      return last7Days.includes(sessionDate)
    })
    .reduce((acc, s) => acc + s.duration, 0) / 60

  return Math.round((totalHours / 7) * 100) / 100
}

// ─── Heatmap Component ─────────────────────────────────────────────────────────

function ProductivityHeatmap({ data }: { data: HeatmapDay[] }) {
  // Reorganize data into weeks (columns) x days (rows)
  const weeks = useMemo(() => {
    const maxWeek = Math.max(...data.map((d) => d.weekIndex), 0)
    const grid: (HeatmapDay | null)[][] = []

    // 7 rows (Sun-Sat), columns for each week
    for (let day = 0; day < 7; day++) {
      grid[day] = []
      for (let week = 0; week <= maxWeek; week++) {
        const entry = data.find((d) => d.dayOfWeek === day && d.weekIndex === week)
        grid[day][week] = entry || null
      }
    }

    return { grid, maxWeek }
  }, [data])

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  // Only show Mon, Wed, Fri labels
  const showLabel = [false, true, false, true, false, true, false]

  // Month labels at the top
  const monthLabels = useMemo(() => {
    const labels: { weekIndex: number; label: string }[] = []
    const seen = new Set<string>()
    for (let week = 0; week <= weeks.maxWeek; week++) {
      const entry = data.find((d) => d.weekIndex === week && d.monthLabel)
      if (entry && entry.monthLabel && !seen.has(`${entry.monthLabel}-${week}`)) {
        seen.add(`${entry.monthLabel}-${week}`)
        labels.push({ weekIndex: week, label: entry.monthLabel })
      }
    }
    return labels
  }, [data, weeks.maxWeek])

  return (
    <TooltipProvider delayDuration={100}>
      <div className="overflow-x-auto">
        {/* Month labels */}
        <div className="flex ml-5 mb-1" style={{ gap: '2px' }}>
          {Array.from({ length: weeks.maxWeek + 1 }, (_, weekIdx) => {
            const monthLabel = monthLabels.find((m) => m.weekIndex === weekIdx)
            return (
              <div
                key={weekIdx}
                className="text-[10px] text-muted-foreground h-4 flex items-start"
                style={{ width: 13, minWidth: 13 }}
              >
                {monthLabel?.label}
              </div>
            )
          })}
        </div>

        {/* Grid */}
        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col shrink-0" style={{ gap: '2px' }}>
            {dayLabels.map((label, i) => (
              <div
                key={i}
                className="text-[10px] text-muted-foreground flex items-center justify-end pr-1.5"
                style={{ height: 13, width: 20 }}
              >
                {showLabel[i] ? label : ''}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="flex" style={{ gap: '2px' }}>
            {Array.from({ length: weeks.maxWeek + 1 }, (_, weekIdx) => (
              <div key={weekIdx} className="flex flex-col" style={{ gap: '2px' }}>
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const cell = weeks.grid[dayIdx]?.[weekIdx]
                  if (!cell) {
                    return (
                      <div
                        key={dayIdx}
                        style={{ width: 11, height: 11, minWidth: 11, minHeight: 11 }}
                        className="rounded-[2px]"
                      />
                    )
                  }

                  const bg = cell.intensity === 0
                    ? 'bg-muted/50 dark:bg-muted/30'
                    : ''

                  return (
                    <Tooltip key={dayIdx}>
                      <TooltipTrigger asChild>
                        <div
                          className="rounded-[2px] cursor-pointer transition-transform hover:scale-125"
                          style={{
                            width: 11,
                            height: 11,
                            minWidth: 11,
                            minHeight: 11,
                            backgroundColor: cell.intensity > 0
                              ? HEATMAP_COLORS[cell.intensity]
                              : undefined,
                          }}
                          {...(cell.intensity === 0 ? { className: `${bg} rounded-[2px] cursor-pointer transition-transform hover:scale-125` } : {})}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="font-medium">{cell.date}</div>
                        <div className="text-muted-foreground">
                          {cell.hours > 0 ? `${cell.hours}h studied` : 'No study'}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

// ─── Stat Card Component ───────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  suffix?: string
  color: string
  delay?: number
}) {
  return (
    <motion.div
      variants={itemVariants}
      custom={delay}
    >
      <Card className="group hover:shadow-lg transition-all duration-300 hover:border-violet-200 dark:hover:border-violet-800 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60" style={{ background: color }} />
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">{label}</p>
              <div className="flex items-baseline gap-1">
                <motion.span
                  className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 + delay * 0.1 }}
                >
                  {value}
                </motion.span>
                {suffix && (
                  <span className="text-sm text-muted-foreground">{suffix}</span>
                )}
              </div>
            </div>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl group-hover:scale-110 transition-transform duration-300"
              style={{ backgroundColor: `${color}15`, color }}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Subject Distribution Chart ────────────────────────────────────────────────

function SubjectDistributionChart({
  subjectData,
}: {
  subjectData: { id: string; name: string; color: string; hours: number }[]
}) {
  const totalHours = subjectData.reduce((acc, s) => acc + s.hours, 0)
  const chartData = subjectData.map((s) => ({
    name: s.name,
    value: s.hours || 0.1, // minimum value for visibility
    fill: s.color,
  }))

  const config: ChartConfig = {}
  subjectData.forEach((s) => {
    config[s.name.toLowerCase().replace(/\s+/g, '_')] = {
      label: s.name,
      color: s.color,
    }
  })

  if (subjectData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Activity className="h-10 w-10 mb-2 opacity-30" />
        <p className="text-sm">No subject data yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative w-40 h-40 shrink-0">
        <ChartContainer config={config} className="w-40 h-40">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => `${Number(value).toFixed(1)}h`}
                />
              }
            />
          </PieChart>
        </ChartContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold tabular-nums">{totalHours.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">hours</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2 min-w-0 w-full sm:w-auto">
        {subjectData.map((subject) => (
          <div key={subject.id} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: subject.color }}
            />
            <span className="text-sm truncate flex-1">{subject.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {subject.hours.toFixed(1)}h
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function StatsView() {
  const { tasks, subjects, habits, studySessions } = useAppStore()

  // ─── Computed Data ────────────────────────────────────────────────────────

  const totalStudyHours = useMemo(
    () =>
      Math.round(
        studySessions
          .filter((s) => s.completed)
          .reduce((acc, s) => acc + s.duration, 0) / 60 * 100
      ) / 100,
    [studySessions]
  )

  const tasksCompleted = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks]
  )

  const avgDailyFocus = useMemo(
    () => getAvgDailyFocus(studySessions),
    [studySessions]
  )

  const habitConsistency = useMemo(
    () => getHabitConsistency(habits),
    [habits]
  )

  const weeklyStudyData = useMemo(
    () => getStudyHoursByDay(studySessions, 7),
    [studySessions]
  )

  const taskTrendData = useMemo(
    () => getTasksCompletedByDay(tasks, 7),
    [tasks]
  )

  const subjectData = useMemo(
    () => getSubjectHours(subjects, studySessions),
    [subjects, studySessions]
  )

  const hourlyData = useMemo(
    () => getHourlyDistribution(studySessions),
    [studySessions]
  )

  const heatmapData = useMemo(
    () => getHeatmapData(studySessions, 12),
    [studySessions]
  )

  const maxSubjectHours = useMemo(
    () => Math.max(...subjectData.map((s) => s.hours), 0.1),
    [subjectData]
  )

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/50">
          <BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Statistics</h1>
          <p className="text-sm text-muted-foreground">Track your productivity & study patterns</p>
        </div>
      </motion.div>

      {/* ── Summary Stats Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={Clock}
          label="Total Study Hours"
          value={totalStudyHours.toFixed(1)}
          suffix="hrs"
          color="#7c3aed"
          delay={0}
        />
        <StatCard
          icon={CheckCircle2}
          label="Tasks Completed"
          value={tasksCompleted}
          suffix={`of ${tasks.length}`}
          color="#059669"
          delay={1}
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Daily Focus"
          value={avgDailyFocus.toFixed(1)}
          suffix="hrs/day"
          color="#2563eb"
          delay={2}
        />
        <StatCard
          icon={Target}
          label="Habit Consistency"
          value={habitConsistency}
          suffix="%"
          color="#f59e0b"
          delay={3}
        />
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Weekly Study Hours */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/50">
                    <Flame className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <CardTitle className="text-base">Weekly Study Hours</CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  Last 7 days
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={weeklyStudyConfig} className="h-52 w-full">
                <BarChart
                  data={weeklyStudyData}
                  margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickMargin={4}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickMargin={4}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [`${Number(value).toFixed(1)} hours`, 'Study']}
                      />
                    }
                  />
                  <Bar
                    dataKey="hours"
                    fill="var(--color-hours)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Task Completion Trend */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-base">Task Completion Trend</CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  Last 7 days
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={taskTrendConfig} className="h-52 w-full">
                <AreaChart
                  data={taskTrendData}
                  margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                >
                  <defs>
                    <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-completed)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-completed)"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickMargin={4}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickMargin={4}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [`${value} tasks`, 'Completed']}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="var(--color-completed)"
                    strokeWidth={2.5}
                    fill="url(#fillCompleted)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Productivity by Hour ─────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/50">
                  <Brain className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle className="text-base">Productivity by Hour</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                Peak hours highlighted
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={hourlyDistConfig} className="h-44 w-full">
              <BarChart
                data={hourlyData}
                margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  tickMargin={4}
                  interval={1}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickMargin={4}
                  allowDecimals={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [`${value} sessions`, 'Sessions']}
                    />
                  }
                />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {hourlyData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.isPeak ? '#7c3aed' : 'oklch(0.75 0.12 293 / 50%)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Heatmap + Subject Distribution ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Productivity Heatmap */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/50">
                    <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <CardTitle className="text-base">Productivity Heatmap</CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  Last 12 weeks
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ProductivityHeatmap data={heatmapData} />

              {/* Heatmap Legend */}
              <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-0.5">
                  <div className="h-3 w-3 rounded-[2px] bg-muted/50 dark:bg-muted/30" />
                  <div
                    className="h-3 w-3 rounded-[2px]"
                    style={{ backgroundColor: HEATMAP_COLORS[1] }}
                  />
                  <div
                    className="h-3 w-3 rounded-[2px]"
                    style={{ backgroundColor: HEATMAP_COLORS[2] }}
                  />
                  <div
                    className="h-3 w-3 rounded-[2px]"
                    style={{ backgroundColor: HEATMAP_COLORS[3] }}
                  />
                  <div
                    className="h-3 w-3 rounded-[2px]"
                    style={{ backgroundColor: HEATMAP_COLORS[4] }}
                  />
                </div>
                <span>More</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subject Distribution */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="hover:shadow-md transition-shadow duration-300 h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
                  <Brain className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle className="text-base">Subject Distribution</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <SubjectDistributionChart subjectData={subjectData} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Subject Breakdown ─────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950/50">
                <BarChart3 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </div>
              <CardTitle className="text-base">Subject Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {subjectData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Activity className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">No subjects yet</p>
                <p className="text-xs">Add subjects in the Study view to see breakdown</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subjectData.map((subject, i) => (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="group relative rounded-xl border bg-muted/20 p-4 hover:bg-muted/40 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="h-4 w-4 rounded-md shrink-0"
                        style={{ backgroundColor: subject.color }}
                      />
                      <span className="text-sm font-semibold truncate flex-1">
                        {subject.name}
                      </span>
                      <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: subject.color }}>
                        {subject.hours.toFixed(1)}h
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: subject.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${maxSubjectHours > 0 ? (subject.hours / maxSubjectHours) * 100 : 0}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 + i * 0.1 }}
                      />
                    </div>

                    {/* Topics info */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {subject.topicsCompleted} / {subject.topicsTotal} topics
                      </span>
                      {subject.topicsTotal > 0 && (
                        <span>
                          {Math.round((subject.topicsCompleted / subject.topicsTotal) * 100)}% complete
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
