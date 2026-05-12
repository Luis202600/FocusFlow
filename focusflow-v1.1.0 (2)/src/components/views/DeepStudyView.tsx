'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Square,
  X,
  Brain,
  Volume2,
  VolumeX,
  CloudRain,
  Waves,
  Wind,
  Music,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  useAppStore,
} from '@/lib/store'
import { toast } from 'sonner'

// ─── Constants ────────────────────────────────────────────────────────────────

const MOTIVATIONAL_QUOTES = [
  { text: 'Deep work is the ability to focus without distraction on a cognitively demanding task.', author: 'Cal Newport' },
  { text: 'The mind is everything. What you think you become.', author: 'Buddha' },
  { text: 'Concentrate all your thoughts upon the work at hand. The sun\'s rays do not burn until brought to a focus.', author: 'Alexander Graham Bell' },
  { text: 'It is the power of the mind to be unconquerable.', author: 'Seneca' },
  { text: 'The successful warrior is the average man, with laser-like focus.', author: 'Bruce Lee' },
  { text: 'Where focus goes, energy flows.', author: 'Tony Robbins' },
  { text: 'You can always find a distraction if you\'re looking for one.', author: 'Tom Kite' },
  { text: 'Starve your distractions, feed your focus.', author: 'Daniel Goleman' },
  { text: 'The key to success is to focus on goals, not obstacles.', author: 'Anonymous' },
  { text: 'Focus is a matter of deciding what things you\'re not going to do.', author: 'John Carmack' },
  { text: 'A mind that is stretched by a new experience can never go back to its old dimensions.', author: 'Oliver Wendell Holmes Jr.' },
  { text: 'The only limit to our realization of tomorrow will be our doubts of today.', author: 'Franklin D. Roosevelt' },
  { text: 'Knowledge is of no value unless you put it into practice.', author: 'Anton Chekhov' },
  { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
  { text: 'Learning is not attained by chance; it must be sought for with ardor and attended to with diligence.', author: 'Abigail Adams' },
]

// ─── Ambient Sound Types ─────────────────────────────────────────────────────

type AmbientSoundType = 'white-noise' | 'brown-noise' | 'rain' | 'wind' | 'ocean'

interface AmbientSoundOption {
  id: AmbientSoundType
  label: string
  icon: typeof Volume2
  description: string
}

const AMBIENT_SOUNDS: AmbientSoundOption[] = [
  { id: 'white-noise', label: 'White Noise', icon: Volume2, description: 'Static hiss for focus' },
  { id: 'brown-noise', label: 'Brown Noise', icon: Waves, description: 'Deep calming rumble' },
  { id: 'rain', label: 'Rain', icon: CloudRain, description: 'Gentle rain simulation' },
  { id: 'wind', label: 'Wind', icon: Wind, description: 'Soft ambient wind' },
  { id: 'ocean', label: 'Ocean', icon: Waves, description: 'Ocean waves rhythm' },
]

// ─── Web Audio API Sound Generator ───────────────────────────────────────────

class AmbientSoundGenerator {
  private audioContext: AudioContext | null = null
  private sourceNode: AudioBufferSourceNode | AudioBufferSourceNode[] | null = null
  private gainNode: GainNode | null = null
  private isPlaying = false
  private currentType: AmbientSoundType | null = null

  start(type: AmbientSoundType) {
    if (this.isPlaying && this.currentType === type) return
    this.stop()

    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      this.gainNode = this.audioContext.createGain()
      this.gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
      this.gainNode.connect(this.audioContext.destination)

      const sampleRate = this.audioContext.sampleRate
      const duration = 4 // seconds, will loop

      switch (type) {
        case 'white-noise':
          this.createWhiteNoise(sampleRate, duration)
          break
        case 'brown-noise':
          this.createBrownNoise(sampleRate, duration)
          break
        case 'rain':
          this.createRain(sampleRate, duration)
          break
        case 'wind':
          this.createWind(sampleRate, duration)
          break
        case 'ocean':
          this.createOcean(sampleRate, duration)
          break
      }

      this.currentType = type
      this.isPlaying = true
    } catch {
      // Audio not available
    }
  }

  private createWhiteNoise(sampleRate: number, duration: number) {
    if (!this.audioContext || !this.gainNode) return

    const bufferSize = sampleRate * duration
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate)

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5
      }
    }

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    // Low-pass filter for softer white noise
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(3000, this.audioContext.currentTime)

    source.connect(filter)
    filter.connect(this.gainNode)
    source.start()
    this.sourceNode = source
  }

  private createBrownNoise(sampleRate: number, duration: number) {
    if (!this.audioContext || !this.gainNode) return

    const bufferSize = sampleRate * duration
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate)

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      let lastOut = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        data[i] = (lastOut + 0.02 * white) / 1.02
        lastOut = data[i]
        data[i] *= 3.5
      }
    }

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    // Low-pass filter for deep brown noise
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, this.audioContext.currentTime)

    source.connect(filter)
    filter.connect(this.gainNode)
    source.start()
    this.sourceNode = source
  }

  private createRain(sampleRate: number, duration: number) {
    if (!this.audioContext || !this.gainNode) return

    const bufferSize = sampleRate * duration
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate)

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      let lastOut = 0
      for (let i = 0; i < bufferSize; i++) {
        // Base brown noise for the rain rumble
        const white = Math.random() * 2 - 1
        const brown = (lastOut + 0.02 * white) / 1.02
        lastOut = brown

        // Add occasional "drops" (random spikes)
        const drop = Math.random() > 0.9999 ? (Math.random() * 0.5 + 0.5) : 0

        // Combine
        data[i] = brown * 2.5 + drop

        // Modulate with slow oscillation for natural feel
        const mod = 0.7 + 0.3 * Math.sin((i / sampleRate) * 0.5 * Math.PI * 2)
        data[i] *= mod
      }
    }

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    // Bandpass for rain-like frequencies
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1200, this.audioContext.currentTime)
    filter.Q.setValueAtTime(0.5, this.audioContext.currentTime)

    source.connect(filter)
    filter.connect(this.gainNode)
    source.start()
    this.sourceNode = source
  }

  private createWind(sampleRate: number, duration: number) {
    if (!this.audioContext || !this.gainNode) return

    const bufferSize = sampleRate * duration
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate)

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      let lastOut = 0
      for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate
        const white = Math.random() * 2 - 1
        const brown = (lastOut + 0.02 * white) / 1.02
        lastOut = brown

        // Slowly modulate for wind gusts
        const gust1 = 0.5 + 0.5 * Math.sin(t * 0.3 * Math.PI * 2)
        const gust2 = 0.5 + 0.5 * Math.sin(t * 0.7 * Math.PI * 2 + 1.3)
        const gustEnvelope = gust1 * 0.6 + gust2 * 0.4

        data[i] = brown * 3 * gustEnvelope
      }
    }

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    // Low-pass for wind character
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(600, this.audioContext.currentTime)
    filter.Q.setValueAtTime(1, this.audioContext.currentTime)

    source.connect(filter)
    filter.connect(this.gainNode)
    source.start()
    this.sourceNode = source
  }

  private createOcean(sampleRate: number, duration: number) {
    if (!this.audioContext || !this.gainNode) return

    // Longer buffer for ocean wave cycle
    const bufferSize = sampleRate * duration
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate)

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      let lastOut = 0
      for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate
        const white = Math.random() * 2 - 1
        const brown = (lastOut + 0.02 * white) / 1.02
        lastOut = brown

        // Ocean wave rhythm - composite of slow sine waves
        const wave1 = 0.5 + 0.5 * Math.sin(t * 0.25 * Math.PI * 2)
        const wave2 = 0.5 + 0.5 * Math.sin(t * 0.15 * Math.PI * 2 + 0.8)
        const wave3 = 0.5 + 0.5 * Math.sin(t * 0.4 * Math.PI * 2 + 2.1)

        // Combine waves for natural ocean rhythm
        const oceanEnvelope = Math.pow(wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2, 1.5)

        data[i] = brown * 4 * oceanEnvelope
      }
    }

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    // Bandpass for ocean wave character
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(500, this.audioContext.currentTime)
    filter.Q.setValueAtTime(0.3, this.audioContext.currentTime)

    source.connect(filter)
    filter.connect(this.gainNode)
    source.start()
    this.sourceNode = source
  }

  setVolume(volume: number) {
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(
        Math.max(0, Math.min(1, volume)),
        this.audioContext.currentTime
      )
    }
  }

  stop() {
    try {
      if (Array.isArray(this.sourceNode)) {
        this.sourceNode.forEach(s => { try { s.stop() } catch { /* already stopped */ } })
      } else if (this.sourceNode) {
        try { this.sourceNode.stop() } catch { /* already stopped */ }
      }
      if (this.audioContext) {
        this.audioContext.close()
      }
    } catch {
      // Cleanup error
    }
    this.sourceNode = null
    this.gainNode = null
    this.audioContext = null
    this.isPlaying = false
    this.currentType = null
  }

  getIsPlaying() {
    return this.isPlaying
  }

  getCurrentType() {
    return this.currentType
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatHHMMSS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// ─── Floating Particles Background ────────────────────────────────────────────

function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 5 + 1.5,
      duration: Math.random() * 25 + 18,
      delay: Math.random() * 12,
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
            backgroundColor: 'rgba(255,255,255,0.3)',
            boxShadow: '0 0 6px rgba(255,255,255,0.15)',
          }}
          animate={{
            y: [0, -40, 0, 40, 0],
            x: [0, 20, -20, 15, 0],
            opacity: [0.03, 0.2, 0.06, 0.15, 0.03],
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

// ─── Chronometer Ring Component ───────────────────────────────────────────────

function ChronometerRing({
  elapsedSeconds,
  size = 340,
  strokeWidth = 5,
  color = '#c084fc',
  isRunning,
}: {
  elapsedSeconds: number
  size?: number
  strokeWidth?: number
  color?: string
  isRunning: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  // Full rotation every 60 seconds for the seconds hand effect
  const secondProgress = (elapsedSeconds % 60) / 60
  const offset = circumference - secondProgress * circumference

  // Minute progress ring (thinner, outer)
  const minuteRadius = (size - strokeWidth * 2 - 8) / 2
  const minuteCircumference = 2 * Math.PI * minuteRadius
  const minuteProgress = (elapsedSeconds % 3600) / 3600
  const minuteOffset = minuteCircumference - minuteProgress * minuteCircumference

  return (
    <svg width={size + 20} height={size + 20} className="transform -rotate-90">
      {/* Outer minute track */}
      <circle
        cx={(size + 20) / 2}
        cy={(size + 20) / 2}
        r={minuteRadius}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={2}
      />
      {/* Outer minute progress */}
      <motion.circle
        cx={(size + 20) / 2}
        cy={(size + 20) / 2}
        r={minuteRadius}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={minuteCircumference}
        animate={{ strokeDashoffset: minuteOffset }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{ opacity: 0.4 }}
      />

      {/* Background ring */}
      <circle
        cx={(size + 20) / 2}
        cy={(size + 20) / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      {/* Glow ring (breathing) when running */}
      {isRunning && (
        <motion.circle
          cx={(size + 20) / 2}
          cy={(size + 20) / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{
            strokeDashoffset: offset,
            opacity: [0.06, 0.18, 0.06],
          }}
          transition={{
            strokeDashoffset: { duration: 1, ease: 'easeOut' },
            opacity: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="blur-lg"
        />
      )}
      {/* Mid glow ring */}
      {isRunning && (
        <motion.circle
          cx={(size + 20) / 2}
          cy={(size + 20) / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{
            strokeDashoffset: offset,
            opacity: [0.12, 0.3, 0.12],
          }}
          transition={{
            strokeDashoffset: { duration: 1, ease: 'easeOut' },
            opacity: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 },
          }}
          className="blur-sm"
        />
      )}
      {/* Progress ring */}
      <motion.circle
        cx={(size + 20) / 2}
        cy={(size + 20) / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── Main DeepStudyView Component ─────────────────────────────────────────────

export default function DeepStudyView() {
  const {
    subjects,
    addStudySession,
    addXP,
    setCurrentView,
    setFocusModeActive,
    checkAchievements,
    settings,
  } = useAppStore()

  // Timer state
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Subject selection
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')

  // Sound state
  const [activeSound, setActiveSound] = useState<AmbientSoundType | null>(null)
  const [soundVolume, setSoundVolume] = useState(0.3)
  const [isMuted, setIsMuted] = useState(false)
  const soundGeneratorRef = useRef<AmbientSoundGenerator | null>(null)

  // Quote state - changes every 45 seconds
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
  )

  // Initialize sound generator
  useEffect(() => {
    soundGeneratorRef.current = new AmbientSoundGenerator()
    return () => {
      soundGeneratorRef.current?.stop()
    }
  }, [])

  // Enter focus mode on mount
  useEffect(() => {
    setFocusModeActive(true)
  }, [setFocusModeActive])

  // Timer tick
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
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
  }, [isRunning, isPaused])

  // Rotate quotes every 45 seconds
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % MOTIVATIONAL_QUOTES.length)
    }, 45000)
    return () => clearInterval(quoteInterval)
  }, [])

  // Sound control handlers
  const handleToggleSound = useCallback((type: AmbientSoundType) => {
    const gen = soundGeneratorRef.current
    if (!gen) return

    if (activeSound === type) {
      gen.stop()
      setActiveSound(null)
    } else {
      gen.start(type)
      gen.setVolume(isMuted ? 0 : soundVolume)
      setActiveSound(type)
    }
  }, [activeSound, isMuted, soundVolume])

  // Volume change handler
  useEffect(() => {
    if (soundGeneratorRef.current && activeSound) {
      soundGeneratorRef.current.setVolume(isMuted ? 0 : soundVolume)
    }
  }, [soundVolume, isMuted, activeSound])

  // Start handler
  const handleStart = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true)
      setIsPaused(false)
      setElapsedSeconds(0)
      setStartedAt(new Date().toISOString())
    } else if (isPaused) {
      setIsPaused(false)
    } else {
      setIsPaused(true)
    }
  }, [isRunning, isPaused])

  // Stop handler - saves session and awards XP
  const handleStop = useCallback(() => {
    const durationMinutes = Math.round(elapsedSeconds / 60)

    // Only save if at least 1 minute of study
    if (durationMinutes >= 1) {
      const subjectName = subjects.find(s => s.id === selectedSubjectId)?.name || 'General'

      addStudySession({
        subjectId: selectedSubjectId || undefined,
        subjectName,
        type: 'deep-study',
        duration: durationMinutes,
        completed: true,
        startedAt: startedAt || new Date().toISOString(),
        endedAt: new Date().toISOString(),
      })

      // Award XP: more XP for longer sessions (base 30 XP, +5 per 5 min)
      const xpAmount = 30 + Math.floor(durationMinutes / 5) * 5
      addXP(xpAmount)
      checkAchievements()

      toast.success('Study session saved!', {
        description: `${formatHHMMSS(elapsedSeconds)} of deep study — +${xpAmount} XP earned!`,
      })
    } else {
      toast.error('Session too short', {
        description: 'Study for at least 1 minute to save a session.',
      })
    }

    // Stop ambient sound
    soundGeneratorRef.current?.stop()
    setActiveSound(null)

    // Reset state
    setIsRunning(false)
    setIsPaused(false)
    setElapsedSeconds(0)
    setStartedAt(null)
  }, [elapsedSeconds, selectedSubjectId, subjects, startedAt, addStudySession, addXP, checkAchievements])

  // Exit handler
  const handleExit = useCallback(() => {
    // If running, stop and save first
    if (isRunning && elapsedSeconds >= 60) {
      handleStop()
    } else {
      soundGeneratorRef.current?.stop()
    }
    setFocusModeActive(false)
    setCurrentView('dashboard')
  }, [isRunning, elapsedSeconds, handleStop, setFocusModeActive, setCurrentView])

  const currentQuote = MOTIVATIONAL_QUOTES[quoteIndex]
  const selectedSubject = useMemo(
    () => subjects.find(s => s.id === selectedSubjectId),
    [subjects, selectedSubjectId]
  )

  // Compute the ring color based on elapsed time for subtle mood shift
  const ringColor = useMemo(() => {
    if (elapsedSeconds < 600) return '#c084fc'  // purple - just starting
    if (elapsedSeconds < 1800) return '#a78bfa'  // violet - warming up
    if (elapsedSeconds < 3600) return '#818cf8'  // indigo - in the zone
    return '#f472b6'  // pink - deep session
  }, [elapsedSeconds])

  return (
    <motion.div
      className="relative h-full overflow-hidden flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #0f0a1e 0%, #1a0e2e 25%, #16082a 50%, #1a0a2e 75%, #0d0b1f 100%)',
        }}
      />

      {/* Animated gradient orbs */}
      <motion.div
        className="absolute inset-0"
        animate={isRunning && !isPaused ? {
          background: [
            'radial-gradient(ellipse at 20% 50%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(192,132,252,0.05) 0%, transparent 50%)',
            'radial-gradient(ellipse at 40% 30%, rgba(139,92,246,0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(168,85,247,0.08) 0%, transparent 50%), radial-gradient(ellipse at 20% 60%, rgba(192,132,252,0.06) 0%, transparent 50%)',
            'radial-gradient(ellipse at 60% 60%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 30% 40%, rgba(168,85,247,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(192,132,252,0.05) 0%, transparent 50%)',
            'radial-gradient(ellipse at 20% 50%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(192,132,252,0.05) 0%, transparent 50%)',
          ],
        } : {}}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDE0djJoLTJ2LTJoMnptMC0yaDJ2MmgtMnYtMnptLTQgNHYyaC0ydi0yaDJ6bTQgMHYyaC0ydi0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

      {/* Floating particles */}
      <FloatingParticles />

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
          {/* Exit button */}
          <motion.button
            onClick={handleExit}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] text-white/70 hover:text-white hover:bg-white/[0.14] transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <X className="h-4 w-4" />
            <span className="text-sm font-medium hidden sm:inline">Exit</span>
          </motion.button>

          {/* Mode indicator */}
          <motion.div
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/[0.07] backdrop-blur-sm border border-white/[0.12]"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Brain className="h-4 w-4 text-purple-300" />
            <span className="text-sm font-semibold text-white/90 uppercase tracking-wider">
              Ultra Study
            </span>
            {isRunning && (
              <motion.div
                className="w-2 h-2 rounded-full bg-green-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </motion.div>

          {/* Subject badge */}
          {selectedSubject ? (
            <motion.div
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/[0.07] backdrop-blur-sm border border-white/[0.12]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedSubject.color }}
              />
              <span className="text-sm font-medium text-white/80 max-w-[100px] truncate">
                {selectedSubject.name}
              </span>
            </motion.div>
          ) : (
            <div className="w-[80px]" />
          )}
        </div>

        {/* Motivational quote */}
        <motion.div
          className="text-center px-6 py-2 sm:py-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={quoteIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-white/60 text-sm italic max-w-lg mx-auto leading-relaxed">
                &ldquo;{currentQuote.text}&rdquo;
              </p>
              <p className="text-white/30 text-xs mt-1">— {currentQuote.author}</p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Main timer area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 px-6">
          {/* Timer ring */}
          <motion.div
            className="relative flex items-center justify-center"
            animate={isRunning && !isPaused ? {
              scale: [1, 1.008, 1],
            } : { scale: 1 }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <ChronometerRing
              elapsedSeconds={elapsedSeconds}
              size={300}
              strokeWidth={4}
              color={ringColor}
              isRunning={isRunning && !isPaused}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={Math.floor(elapsedSeconds)}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0.7 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-5xl sm:text-6xl md:text-7xl font-bold text-white tabular-nums tracking-tight drop-shadow-2xl">
                    {formatHHMMSS(elapsedSeconds)}
                  </span>
                </motion.div>
              </AnimatePresence>
              {isRunning && !isPaused && (
                <motion.span
                  className="text-purple-300/60 text-xs mt-2 font-medium uppercase tracking-widest"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Studying
                </motion.span>
              )}
              {isPaused && (
                <motion.span
                  className="text-amber-300/70 text-xs mt-2 font-medium uppercase tracking-widest"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  Paused
                </motion.span>
              )}
            </div>
          </motion.div>

          {/* Subject selector (shown before start or when not running) */}
          {!isRunning && (
            <motion.div
              className="w-full max-w-xs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Select
                value={selectedSubjectId}
                onValueChange={setSelectedSubjectId}
              >
                <SelectTrigger className="bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 h-11 text-sm backdrop-blur-sm rounded-xl">
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
            </motion.div>
          )}

          {/* Controls */}
          <motion.div
            className="flex items-center gap-3 sm:gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {/* Stop button - only when running */}
            <AnimatePresence>
              {isRunning && (
                <motion.button
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-red-500/20 backdrop-blur-sm flex items-center justify-center text-red-300 hover:text-red-200 hover:bg-red-500/30 transition-all border border-red-500/20"
                  onClick={handleStop}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  title="Stop & Save"
                >
                  <Square className="h-5 w-5 sm:h-6 sm:w-6" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Play/Pause button */}
            <motion.button
              className="h-16 w-16 sm:h-18 sm:w-18 rounded-full bg-white/[0.12] backdrop-blur-md flex items-center justify-center hover:bg-white/[0.2] transition-all border border-white/[0.2] shadow-lg shadow-purple-900/20"
              onClick={handleStart}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ minWidth: 64, minHeight: 64 }}
            >
              <AnimatePresence mode="wait">
                {!isRunning || isPaused ? (
                  <motion.div
                    key="play"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Play className="h-7 w-7 sm:h-8 sm:w-8 text-white ml-0.5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="pause"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Pause className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Spacer for balance when stop isn't shown */}
            {!isRunning && <div className="w-12 sm:w-14" />}
          </motion.div>

          {/* Time milestone indicators */}
          {isRunning && elapsedSeconds > 0 && (
            <motion.div
              className="flex items-center gap-3 text-white/30 text-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {elapsedSeconds >= 600 && (
                <span className="px-2 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
                  10 min
                </span>
              )}
              {elapsedSeconds >= 1800 && (
                <span className="px-2 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
                  30 min
                </span>
              )}
              {elapsedSeconds >= 3600 && (
                <span className="px-2 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
                  1 hour
                </span>
              )}
              {elapsedSeconds >= 7200 && (
                <span className="px-2 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
                  2 hours
                </span>
              )}
            </motion.div>
          )}
        </div>

        {/* Bottom section - Ambient Sound Player */}
        <motion.div
          className="px-4 sm:px-6 pb-6 sm:pb-8 pt-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <div className="max-w-md mx-auto">
            {/* Sound toggle label */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <Music className="h-3.5 w-3.5 text-white/30" />
              <span className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">
                Ambient Sound
              </span>
            </div>

            {/* Sound options */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {AMBIENT_SOUNDS.map((sound) => {
                const SoundIcon = sound.icon
                const isActive = activeSound === sound.id
                return (
                  <motion.button
                    key={sound.id}
                    onClick={() => handleToggleSound(sound.id)}
                    className={`
                      relative flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl transition-all
                      ${isActive
                        ? 'bg-white/[0.12] border-white/[0.2] shadow-lg shadow-purple-500/10'
                        : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]'
                      }
                      border backdrop-blur-sm
                    `}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    title={sound.description}
                  >
                    <SoundIcon className={`h-4 w-4 ${isActive ? 'text-purple-300' : 'text-white/40'}`} />
                    <span className={`text-[10px] font-medium ${isActive ? 'text-purple-200' : 'text-white/40'}`}>
                      {sound.label}
                    </span>
                    {isActive && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-400"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                  </motion.button>
                )
              })}
            </div>

            {/* Volume slider */}
            {activeSound && (
              <motion.div
                className="flex items-center gap-3 mt-3 px-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : soundVolume}
                  onChange={(e) => {
                    setSoundVolume(parseFloat(e.target.value))
                    if (isMuted) setIsMuted(false)
                  }}
                  className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-purple-400 cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
                <span className="text-white/30 text-[10px] font-mono w-8 text-right">
                  {Math.round((isMuted ? 0 : soundVolume) * 100)}%
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
