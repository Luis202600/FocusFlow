'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Lock,
  CheckCircle2,
  Sparkles,
  Star,
  Target,
  BookOpen,
  Flame,
  Zap,
  Crown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { useAppStore, type Achievement } from '@/lib/store'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  all: { label: 'All', icon: Sparkles, color: '#7c3aed' },
  tasks: { label: 'Tasks', icon: CheckCircle2, color: '#059669' },
  study: { label: 'Study', icon: BookOpen, color: '#2563eb' },
  habits: { label: 'Habits', icon: Target, color: '#10b981' },
  streak: { label: 'Streak', icon: Flame, color: '#eab308' },
  special: { label: 'Special', icon: Zap, color: '#ec4899' },
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatUnlockDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatUnlockTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatUnlockDate(dateStr)
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
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
}

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02, y: -2 },
}

// ─── Circular Progress ────────────────────────────────────────────────────────

function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color = '#f59e0b',
  children,
}: {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  children?: React.ReactNode
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = max > 0 ? Math.min(value / max, 1) : 0
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
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Celebration Overlay ──────────────────────────────────────────────────────

function CelebrationOverlay({ show, achievement, onDone }: {
  show: boolean
  achievement: Achievement | null
  onDone: () => void
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onDone, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, onDone])

  if (!show || !achievement) return null

  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 1,
    emoji: ['🎉', '✨', '🌟', '⭐', '🎊', '💫', '🏆', '👑'][Math.floor(Math.random() * 8)],
    size: 14 + Math.random() * 10,
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
              style={{ left: `${p.x}%`, fontSize: p.size }}
              initial={{ y: '100vh', opacity: 0, scale: 0 }}
              animate={{
                y: '-20vh',
                opacity: [0, 1, 1, 0],
                scale: [0, 1.2, 1, 0.5],
                x: [0, (Math.random() - 0.5) * 120],
              }}
              transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
            >
              {p.emoji}
            </motion.div>
          ))}

          {/* Center badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex flex-col items-center gap-3 bg-card/95 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-2xl border pointer-events-auto"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 0.6, repeat: 2 }}
              className="text-4xl"
            >
              {achievement.icon}
            </motion.div>
            <h2 className="text-lg font-bold">Achievement Unlocked!</h2>
            <p className="text-sm font-semibold" style={{ color: achievement.color }}>
              {achievement.title}
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              {achievement.description}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Achievement Card ─────────────────────────────────────────────────────────

function AchievementCard({
  achievement,
  progress,
  isNewlyUnlocked,
  index,
}: {
  achievement: Achievement
  progress: number
  isNewlyUnlocked: boolean
  index: number
}) {
  const isUnlocked = !!achievement.unlockedAt

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.03 }}
    >
      <motion.div
        variants={cardHover}
        initial="rest"
        whileHover="hover"
        className="relative"
      >
        <Card className={`overflow-hidden transition-all duration-300 ${
          isUnlocked
            ? 'border-amber-200 dark:border-amber-800/50 hover:shadow-lg hover:shadow-amber-500/10'
            : 'opacity-70 hover:opacity-90 hover:shadow-md'
        } ${isNewlyUnlocked ? 'ring-2 ring-amber-400/50' : ''}`}>
          {/* Shimmer effect for unlocked */}
          {isUnlocked && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'linear' }}
            />
          )}

          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <motion.div
                className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 text-2xl ${
                  isUnlocked
                    ? 'bg-amber-100 dark:bg-amber-950/40'
                    : 'bg-muted/50 grayscale'
                }`}
                whileHover={isUnlocked ? { scale: 1.1, rotate: [0, -5, 5, 0] } : {}}
                transition={{ duration: 0.3 }}
              >
                {achievement.icon}
              </motion.div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-semibold truncate ${
                    isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {achievement.title}
                  </h4>
                  {isUnlocked && (
                    <Badge
                      className="text-[9px] px-1.5 py-0 h-[16px] border-0 shrink-0"
                      style={{
                        backgroundColor: achievement.color + '20',
                        color: achievement.color,
                      }}
                    >
                      ✓ Done
                    </Badge>
                  )}
                  {!isUnlocked && (
                    <Lock className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${
                  isUnlocked ? 'text-muted-foreground' : 'text-muted-foreground/60'
                }`}>
                  {achievement.description}
                </p>

                {/* Progress / Unlock date */}
                {isUnlocked ? (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      Unlocked {formatUnlockTimeAgo(achievement.unlockedAt!)}
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {Math.min(progress, achievement.requirement)}/{achievement.requirement}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {Math.min(Math.round((progress / achievement.requirement) * 100), 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: achievement.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((progress / achievement.requirement) * 100, 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AchievementsView() {
  const {
    achievements,
    tasks,
    studySessions,
    habits,
    settings,
    journalEntries,
    checkAchievements,
  } = useAppStore()

  const [activeCategory, setActiveCategory] = useState('all')
  const [celebrationAchievement, setCelebrationAchievement] = useState<Achievement | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)

  // Check achievements on mount
  useEffect(() => {
    checkAchievements()
  }, [checkAchievements])

  // Compute progress for each achievement
  const progressMap = useMemo(() => {
    const completedTasks = tasks.filter(t => t.completed).length
    const totalTaskCount = tasks.length
    const totalStudyHours = studySessions.filter(s => s.completed).reduce((acc, s) => acc + s.duration, 0) / 60
    const sessionCount = studySessions.filter(s => s.completed).length
    const habitCount = habits.length
    const journalCount = journalEntries.length
    const streak = settings.streak
    const level = settings.level

    // Best habit streak
    const bestHabitStreak = habits.reduce((best, h) => {
      let currentStreak = 0
      const today = new Date()
      for (let i = 0; i < 365; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const log = h.logs.find(l => l.date === dateStr && l.completed)
        if (log) {
          currentStreak++
        } else {
          if (i === 0) continue
          break
        }
      }
      return Math.max(best, currentStreak)
    }, 0)

    // Night owl / early bird
    const hasNightOwl = studySessions.some(s => {
      const hour = new Date(s.startedAt).getHours()
      return hour >= 22
    })
    const hasEarlyBird = studySessions.some(s => {
      const hour = new Date(s.startedAt).getHours()
      return hour < 8
    })

    return {
      first_task: totalTaskCount,
      task_master_10: completedTasks,
      task_master_50: completedTasks,
      task_master_100: completedTasks,
      first_session: sessionCount,
      study_10h: Math.round(totalStudyHours),
      study_50h: Math.round(totalStudyHours),
      study_100h: Math.round(totalStudyHours),
      first_habit: habitCount,
      habit_7day: bestHabitStreak,
      habit_30day: bestHabitStreak,
      streak_3: streak,
      streak_7: streak,
      streak_30: streak,
      night_owl: hasNightOwl ? 1 : 0,
      early_bird: hasEarlyBird ? 1 : 0,
      journal_first: journalCount,
      level_5: level,
      level_10: level,
    } as Record<string, number>
  }, [tasks, studySessions, habits, settings, journalEntries])

  // Stats
  const unlockedCount = useMemo(
    () => achievements.filter(a => !!a.unlockedAt).length,
    [achievements]
  )
  const totalCount = achievements.length
  const completionPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  // Recently unlocked (last 3)
  const recentlyUnlocked = useMemo(() => {
    return [...achievements]
      .filter(a => !!a.unlockedAt)
      .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
      .slice(0, 3)
  }, [achievements])

  // Filtered achievements by category
  const filteredAchievements = useMemo(() => {
    if (activeCategory === 'all') return achievements
    return achievements.filter(a => a.category === activeCategory)
  }, [achievements, activeCategory])

  // Track newly unlocked achievements for celebration (using ref to avoid setState in effect)
  const prevUnlockedRef = useRef<Set<string>>(new Set(
    achievements.filter(a => !!a.unlockedAt).map(a => a.id)
  ))

  const handleCelebrationDone = useCallback(() => {
    setShowCelebration(false)
    setCelebrationAchievement(null)
  }, [])

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto custom-scrollbar">
      <motion.div
        className="space-y-5 p-4 md:p-6 max-w-5xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Celebration Overlay ──────────────────────────────────────── */}
        <CelebrationOverlay
          show={showCelebration}
          achievement={celebrationAchievement}
          onDone={handleCelebrationDone}
        />

        {/* ── Summary Stats ──────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/20 dark:via-yellow-950/20 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/30">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center gap-6 md:gap-8">
                {/* Circular Progress */}
                <div className="shrink-0">
                  <CircularProgress
                    value={unlockedCount}
                    max={totalCount}
                    size={110}
                    strokeWidth={8}
                    color="#f59e0b"
                  >
                    <span className="text-2xl font-bold">{unlockedCount}</span>
                    <span className="text-[10px] text-muted-foreground">/ {totalCount}</span>
                  </CircularProgress>
                </div>

                {/* Stats */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      Achievements
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {completionPercent}% complete · {totalCount - unlockedCount} remaining
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(CATEGORY_CONFIG).filter(([k]) => k !== 'all').map(([key, config]) => {
                      const catAchievements = achievements.filter(a => a.category === key)
                      const catUnlocked = catAchievements.filter(a => !!a.unlockedAt).length
                      const IconComp = config.icon
                      return (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/50 dark:bg-black/20">
                              <IconComp className="h-3.5 w-3.5 shrink-0" style={{ color: config.color }} />
                              <span className="text-xs font-medium">{catUnlocked}/{catAchievements.length}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {config.label}: {catUnlocked}/{catAchievements.length} unlocked
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>

                  {/* Overall progress bar */}
                  <div className="h-2 bg-amber-200/50 dark:bg-amber-900/30 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPercent}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Recently Unlocked ─────────────────────────────────────── */}
        {recentlyUnlocked.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Recently Unlocked
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recentlyUnlocked.map((achievement, i) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <Card className="border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 overflow-hidden relative">
                      {/* Shimmer */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4, ease: 'linear', delay: i * 0.5 }}
                      />
                      <CardContent className="p-4 relative">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="h-11 w-11 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-xl shrink-0"
                            whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                          >
                            {achievement.icon}
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: achievement.color }}>
                              {achievement.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {achievement.description}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">
                                {formatUnlockTimeAgo(achievement.unlockedAt!)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Category Tabs ─────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="h-9 p-0.5 bg-muted/50">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                const IconComp = config.icon
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="text-xs gap-1.5 px-3 h-8 data-[state=active]:bg-background"
                  >
                    <IconComp className="h-3 w-3" />
                    <span className="hidden sm:inline">{config.label}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </motion.div>

        {/* ── Achievement Cards Grid ────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={activeCategory}
        >
          <AnimatePresence mode="wait">
            {filteredAchievements.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-full"
              >
                <Card className="border-dashed bg-muted/30">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                    <Star className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No achievements in this category</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Keep going to unlock them all!</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              filteredAchievements.map((achievement, index) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  progress={progressMap[achievement.key] ?? 0}
                  isNewlyUnlocked={false}
                  index={index}
                />
              ))
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Empty State (no achievements unlocked at all) ──────── */}
        {unlockedCount === 0 && (
          <motion.div
            variants={itemVariants}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-dashed border-2 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4">
                  <Trophy className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">Start Earning Achievements</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  Complete tasks, study sessions, build habits, and maintain streaks to unlock achievements
                  and show off your progress!
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span>Complete tasks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3 text-sky-500" />
                    <span>Study sessions</span>
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
