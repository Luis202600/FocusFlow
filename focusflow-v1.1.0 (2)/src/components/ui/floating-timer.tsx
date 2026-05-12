'use client'

import { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useAppStore } from '@/lib/store'

// ─── Constants ────────────────────────────────────────────────────────────────

const MODE_COLORS: Record<string, { ring: string; bg: string; stroke: string }> = {
  work: {
    ring: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.15)',
    stroke: '#a78bfa',
  },
  break: {
    ring: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    stroke: '#34d399',
  },
  'long-break': {
    ring: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.15)',
    stroke: '#60a5fa',
  },
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ─── Mini Progress Ring ───────────────────────────────────────────────────────

function MiniProgressRing({
  progress,
  size = 56,
  strokeWidth = 3,
  color = '#a78bfa',
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
    <svg width={size} height={size} className="transform -rotate-90 absolute inset-0">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-white/10"
      />
      {/* Glow */}
      {isRunning && (
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{
            strokeDashoffset: offset,
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            strokeDashoffset: { duration: 0.8, ease: 'easeOut' },
            opacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
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

// ─── FloatingTimer Component ──────────────────────────────────────────────────

export default function FloatingTimer() {
  const {
    pomodoro,
    settings,
    setCurrentView,
    currentView,
  } = useAppStore()

  // Track which session the user has dismissed. When the session changes
  // (different mode/round), the dismissal no longer applies and the timer
  // reappears automatically. No useEffect needed for resetting.
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)

  const modeColors = MODE_COLORS[pomodoro.mode] || MODE_COLORS.work

  const totalTime = useMemo(() => {
    switch (pomodoro.mode) {
      case 'work': return settings.pomodoroWork * 60
      case 'break': return settings.pomodoroBreak * 60
      case 'long-break': return settings.pomodoroLongBreak * 60
      default: return settings.pomodoroWork * 60
    }
  }, [pomodoro.mode, settings])

  const progress = totalTime > 0 ? pomodoro.timeLeft / totalTime : 0
  const isRunning = pomodoro.isRunning && !pomodoro.isPaused

  // Build a session key that changes when the timer session changes
  // (different mode or round). This naturally resets dismissal across sessions.
  const sessionKey = `${pomodoro.mode}-${pomodoro.round}`

  // Show when: timer is running AND (not dismissed OR session has changed since dismissal)
  const isDismissed = dismissedKey === sessionKey
  const showTimer = pomodoro.isRunning && !isDismissed

  const handleClick = useCallback(() => {
    setCurrentView('focus')
  }, [setCurrentView])

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissedKey(sessionKey)
  }, [sessionKey])

  // Don't show floating timer when already in focus view
  if (currentView === 'focus') return null

  return (
    <AnimatePresence>
      {showTimer && (
        <motion.div
          className="fixed bottom-20 right-6 z-50"
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 25,
            duration: 0.3,
          }}
        >
          <motion.button
            onClick={handleClick}
            className="relative group cursor-pointer"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            animate={isRunning ? {
              scale: [1, 1.03, 1],
            } : { scale: 1 }}
            transition={isRunning ? {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            } : { duration: 0.2 }}
          >
            {/* Outer glow */}
            <div
              className="absolute -inset-2 rounded-full blur-lg opacity-40"
              style={{ backgroundColor: modeColors.ring }}
            />

            {/* Background circle */}
            <div
              className="relative w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg"
              style={{ backgroundColor: modeColors.bg }}
            >
              {/* Progress ring */}
              <MiniProgressRing
                progress={progress}
                size={56}
                strokeWidth={3}
                color={modeColors.stroke}
                isRunning={isRunning}
              />

              {/* Time display */}
              <span className="relative z-10 text-[10px] font-bold text-white tabular-nums tracking-tight">
                {formatMMSS(pomodoro.timeLeft)}
              </span>
            </div>

            {/* Dismiss button */}
            <motion.button
              onClick={handleDismiss}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/60 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="h-2.5 w-2.5 text-white/80" />
            </motion.button>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
