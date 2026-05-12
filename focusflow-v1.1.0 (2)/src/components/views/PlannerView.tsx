'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Check,
  Clock,
  CalendarDays,
  MoreHorizontal,
} from 'lucide-react'
import { addDays, format, startOfWeek, isSameDay, isToday } from 'date-fns'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore, type TimeBlock, type Category } from '@/lib/store'

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64 // px per hour slot

const CATEGORY_COLORS: Record<string, {
  bg: string
  text: string
  dot: string
  light: string
  border: string
  leftBorder: string
  ring: string
  gradient: string
}> = {
  study: {
    bg: 'bg-violet-100 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-500',
    light: 'bg-violet-500/10',
    border: 'border-violet-200 dark:border-violet-800',
    leftBorder: 'border-l-violet-500',
    ring: 'ring-violet-200 dark:ring-violet-800',
    gradient: 'from-violet-500/5 to-violet-500/10',
  },
  work: {
    bg: 'bg-sky-100 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
    light: 'bg-sky-500/10',
    border: 'border-sky-200 dark:border-sky-800',
    leftBorder: 'border-l-sky-500',
    ring: 'ring-sky-200 dark:ring-sky-800',
    gradient: 'from-sky-500/5 to-sky-500/10',
  },
  personal: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    light: 'bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-800',
    leftBorder: 'border-l-emerald-500',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
    gradient: 'from-emerald-500/5 to-emerald-500/10',
  },
  break: {
    bg: 'bg-gray-100 dark:bg-gray-800/40',
    text: 'text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400',
    light: 'bg-gray-500/10',
    border: 'border-gray-200 dark:border-gray-700',
    leftBorder: 'border-l-gray-400',
    ring: 'ring-gray-200 dark:ring-gray-700',
    gradient: 'from-gray-500/5 to-gray-500/10',
  },
}

const CATEGORY_LABELS: Record<string, string> = {
  study: 'Study',
  work: 'Work',
  personal: 'Personal',
  break: 'Break',
}

const CATEGORY_ICONS: Record<string, string> = {
  study: '📚',
  work: '💼',
  personal: '🏃',
  break: '☕',
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

function getTimeSlots(dayStartTime: string, dayEndTime: string): number[] {
  const [startH] = dayStartTime.split(':').map(Number)
  const [endH] = dayEndTime.split(':').map(Number)
  const slots: number[] = []
  for (let h = startH; h <= endH; h++) {
    slots.push(h)
  }
  return slots
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function getBlockPosition(
  block: TimeBlock,
  dayStartTime: string,
  dayEndTime: string
): { top: number; height: number } {
  const startMin = timeToMinutes(block.startTime)
  const endMin = timeToMinutes(block.endTime)
  const dayStartMin = timeToMinutes(dayStartTime)
  const dayEndMin = timeToMinutes(dayEndTime)
  const totalMinutes = dayEndMin - dayStartMin

  const top = ((startMin - dayStartMin) / totalMinutes) * (totalMinutes / 60) * HOUR_HEIGHT
  const height = ((endMin - startMin) / 60) * HOUR_HEIGHT

  return { top, height: Math.max(height, 24) }
}

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.personal
}

function formatDuration(startTime: string, endTime: string): string {
  const diff = timeToMinutes(endTime) - timeToMinutes(startTime)
  if (diff < 60) return `${diff}m`
  const hours = Math.floor(diff / 60)
  const mins = diff % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12} ${period}`
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
} as const

const blockVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
} as const

// ─── Current Time Indicator ───────────────────────────────────────────────────

function CurrentTimeIndicator({
  dayStartTime,
  dayEndTime,
}: {
  dayStartTime: string
  dayEndTime: string
}) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 30_000) // update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
  const dayStartMin = timeToMinutes(dayStartTime)
  const dayEndMin = timeToMinutes(dayEndTime)

  if (nowMinutes < dayStartMin || nowMinutes > dayEndMin) return null

  const top = ((nowMinutes - dayStartMin) / 60) * HOUR_HEIGHT

  return (
    <motion.div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center">
        <div className="flex items-center justify-center w-14 shrink-0 -ml-0.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
        </div>
        <div className="flex-1 h-[2px] bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.3)]" />
      </div>
      <div className="pl-16">
        <span className="text-[10px] font-bold text-red-500 tabular-nums">
          {format(currentTime, 'h:mm a')}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Time Block Card ──────────────────────────────────────────────────────────

function TimeBlockCard({
  block,
  dayStartTime,
  dayEndTime,
  onToggleComplete,
  onEdit,
  onDelete,
}: {
  block: TimeBlock
  dayStartTime: string
  dayEndTime: string
  onToggleComplete: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const colors = getCategoryColor(block.category)
  const { top, height } = getBlockPosition(block, dayStartTime, dayEndTime)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className={`absolute left-16 right-3 rounded-lg border-l-[3px] ${colors.leftBorder} ${colors.border} ${colors.bg} cursor-pointer transition-shadow duration-200 overflow-hidden group`}
      style={{ top, height: Math.max(height, 28) }}
      variants={blockVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      layoutId={block.id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        onToggleComplete()
      }}
      whileHover={{ scale: 1.005, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} pointer-events-none`} />

      <div className={`relative p-2 h-full flex flex-col justify-center ${block.completed ? 'opacity-50' : ''}`}>
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-semibold truncate block leading-tight ${block.completed ? 'line-through text-muted-foreground' : ''}`}>
              {block.title}
            </span>
            {height >= 40 && (
              <span className="text-[10px] text-muted-foreground mt-0.5 block tabular-nums">
                {formatTime(block.startTime)} – {formatTime(block.endTime)}
                <span className="ml-1 opacity-70">({formatDuration(block.startTime, block.endTime)})</span>
              </span>
            )}
          </div>

          {/* Completed indicator or action menu */}
          <div className="flex items-center gap-1 shrink-0">
            {block.completed && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500"
              >
                <Check className="h-2.5 w-2.5 text-white" />
              </motion.div>
            )}

            {/* Actions dropdown */}
            <AnimatePresence>
              {isHovered && !block.completed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.12 }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="flex h-5 w-5 items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                        <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); onDelete() }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Category badge (only if block is tall enough) */}
        {height >= 56 && !block.completed && (
          <Badge
            variant="secondary"
            className={`mt-1 w-fit text-[9px] px-1.5 py-0 h-4 ${colors.bg} ${colors.text} border-0`}
          >
            {CATEGORY_ICONS[block.category]} {CATEGORY_LABELS[block.category]}
          </Badge>
        )}
      </div>
    </motion.div>
  )
}

// ─── Mini Date Picker (Week Strip) ────────────────────────────────────────────

function WeekStrip({
  selectedDate,
  onSelectDate,
  timeBlocks,
}: {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  timeBlocks: TimeBlock[]
}) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Check which days have blocks
  const daysWithBlocks = useMemo(() => {
    const dayMap = new Set<string>()
    timeBlocks.forEach((b) => dayMap.add(b.date))
    return dayMap
  }, [timeBlocks])

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {weekDays.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const isSelected = isSameDay(day, selectedDate)
        const isTodayDate = isToday(day)
        const hasBlocks = daysWithBlocks.has(dateStr)

        return (
          <button
            key={dateStr}
            onClick={() => onSelectDate(day)}
            className={`
              relative flex flex-col items-center justify-center gap-0.5
              w-10 sm:w-12 h-14 sm:h-16 rounded-xl transition-all duration-200
              ${isSelected
                ? 'bg-primary text-primary-foreground shadow-md scale-105'
                : isTodayDate
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <span className="text-[10px] font-medium uppercase leading-none">
              {format(day, 'EEE')}
            </span>
            <span className={`text-lg font-bold leading-none ${isSelected ? '' : 'tabular-nums'}`}>
              {format(day, 'd')}
            </span>
            {/* Dot indicator for days with blocks */}
            {hasBlocks && !isSelected && (
              <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isTodayDate ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
            )}
            {hasBlocks && isSelected && (
              <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary-foreground/60" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Add/Edit Time Block Dialog ───────────────────────────────────────────────

function TimeBlockForm({
  editingBlock,
  selectedDate,
  dayStartTime,
  dayEndTime,
  onSave,
  onCancel,
}: {
  editingBlock: TimeBlock | null
  selectedDate: Date
  dayStartTime: string
  dayEndTime: string
  onSave: (data: { title: string; startTime: string; endTime: string; category: Category | 'break' }) => void
  onCancel: () => void
}) {
  const isEditing = !!editingBlock

  // Compute default end time
  const defaultEndTime = useMemo(() => {
    const startH = isEditing
      ? parseInt(editingBlock.startTime.split(':')[0])
      : parseInt(dayStartTime.split(':')[0])
    const endH = Math.min(startH + 1, parseInt(dayEndTime.split(':')[0]))
    return `${endH.toString().padStart(2, '0')}:00`
  }, [isEditing, editingBlock, dayStartTime, dayEndTime])

  // Initialize state from props (not in an effect)
  const [title, setTitle] = useState(isEditing ? editingBlock.title : '')
  const [startTime, setStartTime] = useState(isEditing ? editingBlock.startTime : dayStartTime)
  const [endTime, setEndTime] = useState(isEditing ? editingBlock.endTime : defaultEndTime)
  const [category, setCategory] = useState<Category | 'break'>(isEditing ? editingBlock.category : 'study')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), startTime, endTime, category })
  }

  // Generate time options in 30-min intervals
  const timeOptions = useMemo(() => {
    const [startH] = dayStartTime.split(':').map(Number)
    const [endH] = dayEndTime.split(':').map(Number)
    const options: string[] = []
    for (let h = startH; h <= endH; h++) {
      options.push(`${h.toString().padStart(2, '0')}:00`)
      if (h < endH) {
        options.push(`${h.toString().padStart(2, '0')}:30`)
      }
    }
    return options
  }, [dayStartTime, dayEndTime])

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Time Block' : 'Add Time Block'}</DialogTitle>
        <DialogDescription>
          {isEditing ? 'Update the details of your time block.' : `Schedule a new block for ${format(selectedDate, 'EEEE, MMM d')}.`}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="block-title">Title</Label>
          <Input
            id="block-title"
            placeholder="e.g., Math Study Session"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        {/* Time Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {formatTime(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>End Time</Label>
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions
                  .filter((t) => timeToMinutes(t) > timeToMinutes(startTime))
                  .map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatTime(t)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Duration Preview */}
        {startTime && endTime && timeToMinutes(endTime) > timeToMinutes(startTime) && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDuration(startTime, endTime)}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>{formatTime(startTime)} – {formatTime(endTime)}</span>
          </div>
        )}

        {/* Category */}
        <div className="space-y-2">
          <Label>Category</Label>
          <div className="grid grid-cols-4 gap-2">
            {(['study', 'work', 'personal', 'break'] as const).map((cat) => {
              const colors = getCategoryColor(cat)
              const isSelected = category === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`
                    flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all duration-200
                    ${isSelected
                      ? `${colors.border} ${colors.bg} shadow-sm scale-[1.02]`
                      : 'border-transparent bg-muted/40 hover:bg-muted/60'
                    }
                  `}
                >
                  <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                  <span className={`text-[10px] font-semibold ${isSelected ? colors.text : 'text-muted-foreground'}`}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </DialogClose>
          <Button type="submit" disabled={!title.trim() || timeToMinutes(endTime) <= timeToMinutes(startTime)}>
            {isEditing ? 'Save Changes' : 'Add Block'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

function TimeBlockDialog({
  open,
  onOpenChange,
  editingBlock,
  selectedDate,
  dayStartTime,
  dayEndTime,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingBlock: TimeBlock | null
  selectedDate: Date
  dayStartTime: string
  dayEndTime: string
  onSave: (data: { title: string; startTime: string; endTime: string; category: Category | 'break' }) => void
}) {
  // Key forces remount when editingBlock changes, so form reinitializes from props
  const formKey = editingBlock ? `edit-${editingBlock.id}` : 'add'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <TimeBlockForm
          key={formKey}
          editingBlock={editingBlock}
          selectedDate={selectedDate}
          dayStartTime={dayStartTime}
          dayEndTime={dayEndTime}
          onSave={(data) => { onSave(data); onOpenChange(false) }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

// ─── Main PlannerView Component ───────────────────────────────────────────────

export default function PlannerView() {
  const { timeBlocks, addTimeBlock, updateTimeBlock, deleteTimeBlock, tasks, settings } = useAppStore()

  // ── State ──────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null)
  const [slotClickTime, setSlotClickTime] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const { dayStartTime, dayEndTime } = settings

  // ── Computed ───────────────────────────────────────────────────────────
  const timeSlots = useMemo(() => getTimeSlots(dayStartTime, dayEndTime), [dayStartTime, dayEndTime])

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')

  const selectedDayBlocks = useMemo(
    () =>
      timeBlocks
        .filter((b) => b.date === selectedDateStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [timeBlocks, selectedDateStr]
  )

  const completedCount = useMemo(
    () => selectedDayBlocks.filter((b) => b.completed).length,
    [selectedDayBlocks]
  )

  const totalPlannedMinutes = useMemo(
    () =>
      selectedDayBlocks.reduce((acc, b) => {
        const start = timeToMinutes(b.startTime)
        const end = timeToMinutes(b.endTime)
        return acc + (end - start)
      }, 0),
    [selectedDayBlocks]
  )

  // ── Scroll to current time on mount ────────────────────────────────────
  useEffect(() => {
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const startMin = timeToMinutes(dayStartTime)
    if (nowMin > startMin && timelineRef.current) {
      const scrollTarget = ((nowMin - startMin) / 60) * HOUR_HEIGHT - 100
      timelineRef.current.scrollTop = Math.max(0, scrollTarget)
    }
  }, [dayStartTime])

  // ── Handlers ───────────────────────────────────────────────────────────
  const navigateDay = useCallback((direction: -1 | 1) => {
    setSelectedDate((d) => addDays(d, direction))
  }, [])

  const goToToday = useCallback(() => {
    setSelectedDate(new Date())
  }, [])

  const handleToggleComplete = useCallback(
    (block: TimeBlock) => {
      updateTimeBlock(block.id, { completed: !block.completed })
    },
    [updateTimeBlock]
  )

  const handleEdit = useCallback((block: TimeBlock) => {
    setEditingBlock(block)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    (block: TimeBlock) => {
      deleteTimeBlock(block.id)
    },
    [deleteTimeBlock]
  )

  const handleSlotClick = useCallback(
    (hour: number) => {
      const startTime = `${hour.toString().padStart(2, '0')}:00`
      const endHour = Math.min(hour + 1, parseInt(dayEndTime.split(':')[0]))
      const endTime = `${endHour.toString().padStart(2, '0')}:00`
      setSlotClickTime(startTime)
      setEditingBlock(null)
      setDialogOpen(true)
    },
    [dayEndTime]
  )

  const handleSave = useCallback(
    (data: { title: string; startTime: string; endTime: string; category: Category | 'break' }) => {
      if (editingBlock) {
        updateTimeBlock(editingBlock.id, data)
      } else {
        addTimeBlock({
          ...data,
          date: selectedDateStr,
          completed: false,
        })
      }
      setEditingBlock(null)
      setSlotClickTime(null)
    },
    [editingBlock, addTimeBlock, updateTimeBlock, selectedDateStr]
  )

  const handleOpenDialog = useCallback(() => {
    setEditingBlock(null)
    setSlotClickTime(null)
    setDialogOpen(true)
  }, [])

  // ── Week view data ─────────────────────────────────────────────────────
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const weekBlocks = useMemo(
    () =>
      weekDays.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        return timeBlocks
          .filter((b) => b.date === dateStr)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
      }),
    [weekDays, timeBlocks]
  )

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="h-full flex flex-col p-4 md:p-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Top Bar: Date Navigation + View Toggle ─────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Date Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateDay(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-medium"
                onClick={goToToday}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateDay(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Date Title */}
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold tracking-tight">
                {isToday(selectedDate)
                  ? 'Today'
                  : isSameDay(selectedDate, addDays(new Date(), 1))
                    ? 'Tomorrow'
                    : isSameDay(selectedDate, addDays(new Date(), -1))
                      ? 'Yesterday'
                      : format(selectedDate, 'EEEE, MMM d')}
              </h2>
              {isToday(selectedDate) && (
                <span className="text-sm text-muted-foreground">
                  {format(selectedDate, 'MMMM d')}
                </span>
              )}
            </div>
          </div>

          {/* View Toggle + Add Button */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  viewMode === 'day'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  viewMode === 'week'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Week
              </button>
            </div>

            {/* Add Block Button */}
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleOpenDialog}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Block</span>
            </Button>
          </div>
        </div>

        {/* Mini Date Picker (Week Strip) */}
        <div className="flex items-center justify-center">
          <WeekStrip
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            timeBlocks={timeBlocks}
          />
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {selectedDayBlocks.length} block{selectedDayBlocks.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {totalPlannedMinutes >= 60
              ? `${Math.floor(totalPlannedMinutes / 60)}h ${totalPlannedMinutes % 60 > 0 ? `${totalPlannedMinutes % 60}m` : ''}`
              : `${totalPlannedMinutes}m`}
            {' '}planned
          </span>
          {completedCount > 0 && (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              {completedCount} done
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex-1 min-h-0">
        {viewMode === 'day' ? (
          /* ── Day View ───────────────────────────────────────────────── */
          <Card className="h-full border shadow-sm overflow-hidden">
            <CardContent className="p-0 h-full">
              <ScrollArea className="h-full" ref={timelineRef as never}>
                <div
                  className="relative"
                  style={{ height: (timeSlots.length) * HOUR_HEIGHT + 40 }}
                >
                  {/* Hour Grid Lines + Labels */}
                  {timeSlots.map((hour, i) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 flex"
                      style={{ top: i * HOUR_HEIGHT }}
                    >
                      {/* Time Label */}
                      <div className="w-14 shrink-0 pr-2 pt-0 text-right">
                        <span className="text-[11px] font-medium text-muted-foreground/60 tabular-nums">
                          {formatHour(hour)}
                        </span>
                      </div>

                      {/* Grid Line + Clickable Slot */}
                      <div
                        className="flex-1 border-t border-border/50 hover:bg-muted/20 transition-colors duration-150 cursor-pointer relative group"
                        style={{ height: HOUR_HEIGHT }}
                        onClick={() => handleSlotClick(hour)}
                      >
                        {/* Plus indicator on hover */}
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="h-3.5 w-3.5 text-muted-foreground/40" />
                        </div>

                        {/* Half-hour dashed line */}
                        {i < timeSlots.length - 1 && (
                          <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-border/25" />
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Time Block Cards */}
                  <AnimatePresence>
                    {selectedDayBlocks.map((block) => (
                      <TimeBlockCard
                        key={block.id}
                        block={block}
                        dayStartTime={dayStartTime}
                        dayEndTime={dayEndTime}
                        onToggleComplete={() => handleToggleComplete(block)}
                        onEdit={() => handleEdit(block)}
                        onDelete={() => handleDelete(block)}
                      />
                    ))}
                  </AnimatePresence>

                  {/* Current Time Indicator */}
                  {isToday(selectedDate) && (
                    <CurrentTimeIndicator
                      dayStartTime={dayStartTime}
                      dayEndTime={dayEndTime}
                    />
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          /* ── Week View ──────────────────────────────────────────────── */
          <Card className="h-full border shadow-sm overflow-hidden">
            <CardContent className="p-0 h-full">
              <ScrollArea className="h-full">
                <div className="min-w-[700px]">
                  {/* Week Header */}
                  <div className="sticky top-0 z-10 bg-background border-b flex">
                    <div className="w-14 shrink-0" />
                    {weekDays.map((day, i) => {
                      const dateStr = format(day, 'yyyy-MM-dd')
                      const isSelected = isSameDay(day, selectedDate)
                      const isTodayDate = isToday(day)
                      return (
                        <div
                          key={dateStr}
                          className={`flex-1 text-center py-2 cursor-pointer transition-colors hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''}`}
                          onClick={() => { setSelectedDate(day); setViewMode('day') }}
                        >
                          <div className={`text-[10px] font-medium uppercase ${isTodayDate ? 'text-primary' : 'text-muted-foreground'}`}>
                            {format(day, 'EEE')}
                          </div>
                          <div className={`text-lg font-bold ${isTodayDate ? 'text-primary' : ''} ${isSelected ? 'underline' : ''}`}>
                            {format(day, 'd')}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Time Grid */}
                  <div className="relative">
                    {timeSlots.map((hour, hourIdx) => (
                      <div key={hour} className="flex" style={{ height: HOUR_HEIGHT }}>
                        {/* Time Label */}
                        <div className="w-14 shrink-0 pr-2 text-right pt-0">
                          <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                            {formatHour(hour)}
                          </span>
                        </div>

                        {/* Day Columns */}
                        {weekDays.map((day, dayIdx) => {
                          const dateStr = format(day, 'yyyy-MM-dd')
                          const dayBlocksList = weekBlocks[dayIdx]
                          // Filter blocks that start at this hour
                          const hourBlocks = dayBlocksList.filter((b) => {
                            const blockHour = parseInt(b.startTime.split(':')[0])
                            return blockHour === hour
                          })

                          return (
                            <div
                              key={dateStr}
                              className={`flex-1 border-t border-r border-border/30 relative ${
                                isToday(day) ? 'bg-primary/[0.02]' : ''
                              } ${isSameDay(day, selectedDate) ? 'bg-muted/10' : ''} cursor-pointer hover:bg-muted/20 transition-colors`}
                              onClick={() => {
                                setSelectedDate(day)
                                handleSlotClick(hour)
                              }}
                            >
                              {/* Half hour line */}
                              <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-border/15" />

                              {/* Mini block indicators */}
                              {hourBlocks.map((block) => {
                                const colors = getCategoryColor(block.category)
                                const blockHeight = Math.max(
                                  ((timeToMinutes(block.endTime) - timeToMinutes(block.startTime)) / 60) * HOUR_HEIGHT,
                                  16
                                )
                                return (
                                  <motion.div
                                    key={block.id}
                                    className={`absolute left-0.5 right-0.5 rounded ${colors.dot} opacity-80 px-1 overflow-hidden`}
                                    style={{ height: blockHeight }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.8 }}
                                    title={`${block.title} (${formatTime(block.startTime)} - ${formatTime(block.endTime)})`}
                                  >
                                    <span className="text-[9px] font-medium text-white truncate block leading-tight pt-0.5">
                                      {block.title}
                                    </span>
                                  </motion.div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    ))}

                    {/* Current Time Line for today's column */}
                    {weekDays.some((d) => isToday(d)) && (
                      (() => {
                        const todayIdx = weekDays.findIndex((d) => isToday(d))
                        const now = new Date()
                        const nowMin = now.getHours() * 60 + now.getMinutes()
                        const dayStartMin = timeToMinutes(dayStartTime)
                        const dayEndMin = timeToMinutes(dayEndTime)
                        if (nowMin >= dayStartMin && nowMin <= dayEndMin) {
                          const topPos = ((nowMin - dayStartMin) / 60) * HOUR_HEIGHT
                          return (
                            <div
                              className="absolute left-14 right-0 z-10 pointer-events-none"
                              style={{ top: topPos }}
                            >
                              <div
                                className="h-[2px] bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.3)]"
                                style={{
                                  marginLeft: `${todayIdx * (100 / 7)}%`,
                                  width: `${100 / 7}%`,
                                }}
                              />
                            </div>
                          )
                        }
                        return null
                      })()
                    )}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* ── Floating Add Button (Mobile) ────────────────────────────────── */}
      <motion.div
        className="fixed bottom-6 right-6 z-30 sm:hidden"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={handleOpenDialog}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* ── Add/Edit Dialog ─────────────────────────────────────────────── */}
      <TimeBlockDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingBlock(null)
            setSlotClickTime(null)
          }
        }}
        editingBlock={editingBlock}
        selectedDate={selectedDate}
        dayStartTime={dayStartTime}
        dayEndTime={dayEndTime}
        onSave={handleSave}
      />
    </motion.div>
  )
}
