'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  X,
  Timer,
  Coffee,
  Brain,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useAppStore,
} from '@/lib/store'
import { toast } from 'sonner'

// ─── Sound Notification ───────────────────────────────────────────────────────

function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(830, audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8)
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.8)
  } catch {
    // Audio not available
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MOTIVATIONAL_QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { text: 'It is during our darkest moments that we must focus to see the light.', author: 'Aristotle' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: 'The future depends on what you do today.', author: 'Mahatma Gandhi' },
  { text: 'Your time is limited, don\'t waste it living someone else\'s life.', author: 'Steve Jobs' },
  { text: 'Strive not to be a success, but rather to be of value.', author: 'Albert Einstein' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'Don\'t watch the clock; do what it does. Keep going.', author: 'Sam Levenson' },
  { text: 'You don\'t have to be great to start, but you have to start to be great.', author: 'Zig Ziglar' },
  { text: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt' },
  { text: 'The only impossible journey is the one you never begin.', author: 'Tony Robbins' },
  { text: 'What we fear doing most is usually what we most need to do.', author: 'Tim Ferriss' },
]

const MODE_CONFIG: Record<string, {
  label: string
  icon: typeof Timer
  gradient: string
  ringColor: string
  bgGlow: string
  description: string
}> = {
  work: {
    label: 'Focus Time',
    icon: Brain,
    gradient: 'from-violet-600 via-purple-600 to-fuchsia-600',
    ringColor: '#a78bfa',
    bgGlow: 'rgba(139, 92, 246, 0.15)',
    description: 'Stay focused and productive',
  },
  break: {
    label: 'Short Break',
    icon: Coffee,
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    ringColor: '#34d399',
    bgGlow: 'rgba(16, 185, 129, 0.15)',
    description: 'Relax and recharge',
  },
  'long-break': {
    label: 'Long Break',
    icon: Coffee,
    gradient: 'from-sky-500 via-blue-500 to-indigo-500',
    ringColor: '#60a5fa',
    bgGlow: 'rgba(59, 130, 246, 0.15)',
    description: 'You earned a longer rest',
  },
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Breathing Ring Component ─────────────────────────────────────────────────

function BreathingTimerRing({
  progress,
  size = 320,
  strokeWidth = 6,
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
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />
      {/* Glow ring (breathing) */}
      {isRunning && (
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{
            strokeDashoffset: offset,
            opacity: [0.08, 0.2, 0.08],
          }}
          transition={{
            strokeDashoffset: { duration: 1, ease: 'easeOut' },
            opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="blur-md"
        />
      )}
      {/* Mid glow ring */}
      {isRunning && (
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{
            strokeDashoffset: offset,
            opacity: [0.15, 0.35, 0.15],
          }}
          transition={{
            strokeDashoffset: { duration: 1, ease: 'easeOut' },
            opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
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
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── Floating Particles Background ────────────────────────────────────────────

function FloatingParticles({ color }: { color: string }) {
  const particles = useMemo(() =>
    Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
    })), []
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: color,
          }}
          animate={{
            y: [0, -30, 0, 30, 0],
            x: [0, 15, -15, 10, 0],
            opacity: [0.05, 0.15, 0.08, 0.12, 0.05],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ─── Main FocusView Component ─────────────────────────────────────────────────

export default function FocusView() {
  const {
    pomodoro,
    setPomodoro,
    resetPomodoro,
    settings,
    subjects,
    tasks,
    addStudySession,
    addXP,
    setCurrentView,
    setFocusModeActive,
    checkAchievements,
  } = useAppStore()

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [quote] = useState(() =>
    MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
  )
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(pomodoro.subjectId || '')
  const [selectedTopicId, setSelectedTopicId] = useState<string>(pomodoro.topicId || '')

  const modeConfig = MODE_CONFIG[pomodoro.mode]
  const ModeIcon = modeConfig.icon

  const totalTime = useMemo(() => {
    switch (pomodoro.mode) {
      case 'work': return settings.pomodoroWork * 60
      case 'break': return settings.pomodoroBreak * 60
      case 'long-break': return settings.pomodoroLongBreak * 60
      default: return settings.pomodoroWork * 60
    }
  }, [pomodoro.mode, settings])

  const progress = totalTime > 0 ? pomodoro.timeLeft / totalTime : 0

  const selectedSubject = useMemo(
    () => subjects.find(s => s.id === selectedSubjectId),
    [subjects, selectedSubjectId]
  )

  const availableTopics = useMemo(
    () => selectedSubject?.topics || [],
    [selectedSubject]
  )

  // Today's first incomplete task
  const currentTask = useMemo(() => {
    const today = getTodayStr()
    return tasks.find(t => !t.completed && t.dueDate === today)
  }, [tasks])

  // Enter focus mode on mount
  useEffect(() => {
    setFocusModeActive(true)
    return () => {
      // Don't automatically deactivate — let the exit button handle it
    }
  }, [setFocusModeActive])

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
      const wasWork = pomodoro.mode === 'work'
      const subjectName = selectedSubject?.name || 'General'

      // Play notification sound
      if (settings.soundEnabled) {
        playNotificationSound()
      }

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

        // Award XP
        addXP(25)
        checkAchievements()

        // Switch to break or long break
        const nextRound = pomodoro.round + 1
        if (nextRound > settings.pomodoroRounds) {
          // Completed all rounds — cycle complete
          setPomodoro({
            mode: 'long-break',
            timeLeft: settings.pomodoroLongBreak * 60,
            isPaused: false,
            round: pomodoro.round,
          })
          toast.success('Pomodoro cycle complete!', {
            description: `Great work! You've finished ${settings.pomodoroRounds} rounds. Take a long break.`,
          })
        } else if (pomodoro.round % settings.pomodoroRounds === 0) {
          setPomodoro({
            mode: 'long-break',
            timeLeft: settings.pomodoroLongBreak * 60,
            isPaused: false,
            round: pomodoro.round,
          })
          toast.success('Great work! Time for a long break.', {
            description: `Completed round ${pomodoro.round}`,
          })
        } else {
          setPomodoro({
            mode: 'break',
            timeLeft: settings.pomodoroBreak * 60,
            isPaused: false,
            round: pomodoro.round,
          })
          toast.success('Focus session complete!', {
            description: `+25 XP — Take a short break.`,
          })
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
        toast('Break over!', {
          description: 'Ready to focus again?',
        })
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
      if (nextRound > settings.pomodoroRounds || pomodoro.round % settings.pomodoroRounds === 0) {
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

  const handleExit = useCallback(() => {
    setFocusModeActive(false)
    setCurrentView('dashboard')
  }, [setFocusModeActive, setCurrentView])

  return (
    <motion.div
      className="relative h-full overflow-hidden flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated gradient background */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${modeConfig.gradient}`}
        layout
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />

      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0djJoLTJ2LTJoMnptMC0yaDJ2MmgtMnYtMnptLTQgNHYyaC0ydi0yaDJ6bTQgMHYyaC0ydi0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />

      {/* Floating particles */}
      <FloatingParticles color="rgba(255,255,255,0.4)" />

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4">
          {/* Exit button */}
          <motion.button
            onClick={handleExit}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 hover:text-white hover:bg-white/20 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <X className="h-4 w-4" />
            <span className="text-sm font-medium">Exit Focus Mode</span>
          </motion.button>

          {/* Mode indicator */}
          <AnimatePresence mode="wait">
            <motion.div
              key={pomodoro.mode}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
            >
              <ModeIcon className="h-4 w-4 text-white/90" />
              <span className="text-sm font-semibold text-white/90 uppercase tracking-wider">
                {modeConfig.label}
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Spacer for balance */}
          <div className="w-[140px]" />
        </div>

        {/* Motivational quote */}
        <motion.div
          className="text-center px-6 py-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <p className="text-white/70 text-sm italic max-w-lg mx-auto">
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="text-white/40 text-xs mt-1">— {quote.author}</p>
        </motion.div>

        {/* Main timer area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          {/* Timer ring */}
          <motion.div
            className="relative flex items-center justify-center"
            animate={pomodoro.isRunning && !pomodoro.isPaused ? {
              scale: [1, 1.01, 1],
            } : { scale: 1 }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <BreathingTimerRing
              progress={progress}
              size={320}
              strokeWidth={5}
              color={modeConfig.ringColor}
              isRunning={pomodoro.isRunning && !pomodoro.isPaused}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={pomodoro.timeLeft}
                  className="text-7xl font-bold text-white tabular-nums tracking-tighter drop-shadow-2xl"
                  initial={{ scale: 0.95, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {formatMMSS(pomodoro.timeLeft)}
                </motion.span>
              </AnimatePresence>
              <span className="text-white/50 text-sm mt-2 font-medium">
                Round {pomodoro.round} of {settings.pomodoroRounds}
              </span>
            </div>
          </motion.div>

          {/* Round indicators */}
          <div className="flex items-center gap-2">
            {Array.from({ length: settings.pomodoroRounds }).map((_, i) => {
              const isCompleted = i < pomodoro.round - 1
              const isCurrent = i === pomodoro.round - 1 && pomodoro.mode === 'work'
              return (
                <motion.div
                  key={i}
                  className="rounded-full transition-all duration-500"
                  animate={{
                    width: isCurrent ? 24 : 10,
                    height: 10,
                    backgroundColor: isCompleted
                      ? 'rgba(255,255,255,0.7)'
                      : isCurrent
                        ? 'rgba(255,255,255,0.5)'
                        : 'rgba(255,255,255,0.15)',
                    scale: isCurrent ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: isCurrent ? 2 : 0.3,
                    repeat: isCurrent && pomodoro.isRunning && !pomodoro.isPaused ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                />
              )
            })}
          </div>

          {/* Current task */}
          {currentTask && (
            <motion.div
              className="max-w-md w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 text-center">
                <p className="text-white/50 text-[10px] uppercase tracking-widest font-semibold mb-1">
                  Current Task
                </p>
                <p className="text-white/90 text-sm font-medium truncate">
                  {currentTask.title}
                </p>
              </div>
            </motion.div>
          )}

          {/* Subject/topic selector */}
          <motion.div
            className="w-full max-w-sm space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Select
              value={selectedSubjectId}
              onValueChange={(v) => {
                setSelectedSubjectId(v)
                setSelectedTopicId('')
              }}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-10 text-sm backdrop-blur-sm rounded-xl">
                <SelectValue placeholder="What are you studying?" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {availableTopics.length > 0 && (
              <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-10 text-sm backdrop-blur-sm rounded-xl">
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
          </motion.div>

          {/* Controls */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {/* Reset */}
            <motion.button
              className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all border border-white/15"
              onClick={handleReset}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Reset"
            >
              <RotateCcw className="h-4 w-4" />
            </motion.button>

            {/* Play/Pause */}
            <motion.button
              className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all border border-white/30 shadow-lg shadow-black/10"
              onClick={handleStart}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                {!pomodoro.isRunning || pomodoro.isPaused ? (
                  <motion.div
                    key="play"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Play className="h-7 w-7 text-white ml-0.5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="pause"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Pause className="h-7 w-7 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Skip */}
            <motion.button
              className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all border border-white/15"
              onClick={handleSkip}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Skip"
            >
              <SkipForward className="h-4 w-4" />
            </motion.button>
          </motion.div>
        </div>

        {/* Bottom description */}
        <div className="text-center pb-8">
          <motion.p
            className="text-white/40 text-xs font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {modeConfig.description}
          </motion.p>
        </div>
      </div>
    </motion.div>
  )
}
