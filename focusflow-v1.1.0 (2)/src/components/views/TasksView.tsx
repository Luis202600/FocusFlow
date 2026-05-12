'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  LayoutGrid,
  List,
  CalendarDays,
  CalendarClock,
  CalendarX,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  Calendar,
  Tag,
  BookOpen,
  Briefcase,
  User,
  Search,
  SortAsc,
  X,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { useAppStore, type Task, type TaskStatus, type TaskPriority, type Category } from '@/lib/store'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; bg: string; text: string; dot: string; hex: string; label: string; order: number }> = {
  urgent: { color: 'red', bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500', hex: '#ef4444', label: 'Urgent', order: 0 },
  high: { color: 'orange', bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500', hex: '#f97316', label: 'High', order: 1 },
  medium: { color: 'amber', bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', hex: '#f59e0b', label: 'Medium', order: 2 },
  low: { color: 'gray', bg: 'bg-gray-100 dark:bg-gray-800/40', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400', hex: '#9ca3af', label: 'Low', order: 3 },
}

const CATEGORY_CONFIG: Record<Category, { bg: string; text: string; dot: string; border: string; icon: typeof BookOpen; label: string }> = {
  study: { bg: 'bg-violet-100 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500', border: 'border-violet-200 dark:border-violet-800', icon: BookOpen, label: 'Study' },
  work: { bg: 'bg-sky-100 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', dot: 'bg-sky-500', border: 'border-sky-200 dark:border-sky-800', icon: Briefcase, label: 'Work' },
  personal: { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800', icon: User, label: 'Personal' },
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; dot: string; border: string }> = {
  'todo': { label: 'To Do', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-950/30', dot: 'bg-slate-400', border: 'border-slate-200 dark:border-slate-800' },
  'in-progress': { label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20', dot: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-800' },
  'done': { label: 'Done', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20', dot: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800' },
}

const STATUS_ORDER: TaskStatus[] = ['todo', 'in-progress', 'done']

type ViewMode = 'kanban' | 'list'
type FilterMode = 'all' | 'today' | 'upcoming'
type CategoryFilter = 'all' | Category
type SortMode = 'priority' | 'dueDate' | 'createdDate'

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'
  if (date.getTime() === yesterday.getTime()) return 'Yesterday'

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr + 'T23:59:59')
  return date < new Date()
}

function isToday(dateStr: string): boolean {
  return dateStr === getTodayStr()
}

function isUpcoming(dateStr: string): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date > today
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
  hidden: { opacity: 0, y: 12, scale: 0.97 },
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

// ─── Task Dialog Component ────────────────────────────────────────────────────

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTask: Task | null
  defaultStatus?: TaskStatus
}

function TaskDialog({ open, onOpenChange, editingTask, defaultStatus = 'todo' }: TaskDialogProps) {
  const { addTask, updateTask } = useAppStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [category, setCategory] = useState<Category>('study')
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [tagsInput, setTagsInput] = useState('')
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Reset form when dialog opens/changes
  const resetForm = useCallback(() => {
    if (editingTask) {
      setTitle(editingTask.title)
      setDescription(editingTask.description || '')
      setPriority(editingTask.priority)
      setCategory(editingTask.category)
      setDueDate(editingTask.dueDate ? new Date(editingTask.dueDate + 'T00:00:00') : undefined)
      setTagsInput(editingTask.tags?.join(', ') || '')
      setStatus(editingTask.status)
    } else {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setCategory('study')
      setDueDate(undefined)
      setTagsInput('')
      setStatus(defaultStatus)
    }
  }, [editingTask, defaultStatus])

  // Reset on open change
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) resetForm()
    onOpenChange(newOpen)
  }

  const handleSubmit = () => {
    if (!title.trim()) return

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    if (editingTask) {
      updateTask(editingTask.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        dueDate: dueDate ? dueDate.toISOString().split('T')[0] : undefined,
        tags: tags.length > 0 ? tags : undefined,
        status,
        completed: status === 'done',
      })
    } else {
      addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        dueDate: dueDate ? dueDate.toISOString().split('T')[0] : undefined,
        tags: tags.length > 0 ? tags : undefined,
        status,
        completed: status === 'done',
      })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
          <DialogDescription>
            {editingTask ? 'Update your task details' : 'Create a new task to stay organized'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
            <Input
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim()) handleSubmit()
              }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Add more details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Priority & Category Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => {
                  const cfg = PRIORITY_CONFIG[p]
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
                        priority === p
                          ? `${cfg.bg} ${cfg.text} border-current/20 ring-1 ring-current/20`
                          : 'border-border hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${cfg.dot} shrink-0`} />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <div className="space-y-1.5">
                {(Object.keys(CATEGORY_CONFIG) as Category[]).map((c) => {
                  const cfg = CATEGORY_CONFIG[c]
                  const Icon = cfg.icon
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium border w-full transition-all ${
                        category === c
                          ? `${cfg.bg} ${cfg.text} border-current/20 ring-1 ring-current/20`
                          : 'border-border hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Status (only when editing) */}
          {editingTask && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => {
                    const cfg = STATUS_CONFIG[s]
                    return (
                      <SelectItem key={s} value={s}>
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <div className="flex items-center gap-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`flex-1 justify-start text-left font-normal ${!dueDate && 'text-muted-foreground'}`}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {dueDate ? formatDateShort(dueDate.toISOString().split('T')[0]) : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={dueDate}
                    onSelect={(d) => {
                      setDueDate(d ?? undefined)
                      setCalendarOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {dueDate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setDueDate(undefined)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear date</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </label>
            <Input
              placeholder="Comma-separated tags (e.g. math, exam, review)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            {tagsInput && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tagsInput.split(',').map((t, i) => {
                  const trimmed = t.trim()
                  if (!trimmed) return null
                  return (
                    <Badge key={i} variant="secondary" className="text-[10px] h-5">
                      {trimmed}
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            {editingTask ? 'Save Changes' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Quick Add Input ──────────────────────────────────────────────────────────

interface QuickAddProps {
  status: TaskStatus
  onAdd: (title: string, status: TaskStatus) => void
}

function QuickAddInput({ status, onAdd }: QuickAddProps) {
  const [value, setValue] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSubmit = () => {
    if (value.trim()) {
      onAdd(value.trim(), status)
      setValue('')
      setIsExpanded(false)
    }
  }

  return (
    <div className="px-1">
      {isExpanded ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2"
        >
          <Input
            placeholder="Task title... (Enter to add)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
              if (e.key === 'Escape') {
                setIsExpanded(false)
                setValue('')
              }
            }}
            autoFocus
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={handleSubmit} disabled={!value.trim()} className="h-8 shrink-0">
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsExpanded(false)
              setValue('')
            }}
            className="h-8 shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-dashed border-transparent hover:border-border"
        >
          <Plus className="h-4 w-4" />
          Quick add task
        </button>
      )}
    </div>
  )
}

// ─── Task Card (Kanban) ──────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onToggleComplete: (id: string, completed: boolean) => void
}

function TaskCard({ task, onEdit, onDelete, onStatusChange, onToggleComplete }: TaskCardProps) {
  const priCfg = PRIORITY_CONFIG[task.priority]
  const catCfg = CATEGORY_CONFIG[task.category]
  const currentStatusIdx = STATUS_ORDER.indexOf(task.status)
  const overdue = task.dueDate ? isOverdue(task.dueDate) && !task.completed : false

  return (
    <motion.div
      layout
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layoutId={task.id}
      className="group relative"
    >
      <Card className={`border transition-all duration-200 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20 cursor-pointer border-l-[3px] ${task.completed ? 'opacity-60' : ''} bg-card`}
        style={!task.completed ? { borderLeftColor: priCfg.hex } : undefined}
      >
        <CardContent className="p-3 space-y-2">
          {/* Top row: priority dot + title + actions */}
          <div className="flex items-start gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleComplete(task.id, !task.completed)
              }}
              className="mt-0.5 shrink-0"
            >
              {task.completed ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
              ) : (
                <Circle className={`h-4.5 w-4.5 text-muted-foreground/50 hover:${priCfg.text} transition-colors`} />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-snug ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </p>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
              )}
            </div>

            {/* Quick actions on hover */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {/* Move left */}
              {currentStatusIdx > 0 && !task.completed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        onStatusChange(task.id, STATUS_ORDER[currentStatusIdx - 1])
                      }}
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Move to {STATUS_CONFIG[STATUS_ORDER[currentStatusIdx - 1]].label}</TooltipContent>
                </Tooltip>
              )}
              {/* Move right */}
              {currentStatusIdx < STATUS_ORDER.length - 1 && !task.completed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        onStatusChange(task.id, STATUS_ORDER[currentStatusIdx + 1])
                      }}
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Move to {STATUS_CONFIG[STATUS_ORDER[currentStatusIdx + 1]].label}</TooltipContent>
                </Tooltip>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {STATUS_ORDER.map((s) => {
                    if (s === task.status) return null
                    return (
                      <DropdownMenuItem key={s} onClick={() => onStatusChange(task.id, s)}>
                        <span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[s].dot} mr-2`} />
                        Move to {STATUS_CONFIG[s].label}
                      </DropdownMenuItem>
                    )
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(task.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Bottom row: category + due date + tags */}
          <div className="flex items-center gap-1.5 flex-wrap pl-6">
            {/* Category badge */}
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-[18px] border-0 ${catCfg.bg} ${catCfg.text}`}
            >
              {catCfg.label}
            </Badge>

            {/* Priority indicator */}
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-[18px] border-0 ${priCfg.bg} ${priCfg.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${priCfg.dot} mr-1`} />
              {priCfg.label}
            </Badge>

            {/* Due date */}
            {task.dueDate && (
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 h-[18px] border-0 ${
                  overdue
                    ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                    : task.completed
                    ? ''
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <CalendarDays className="h-2.5 w-2.5 mr-1" />
                {formatDateShort(task.dueDate)}
              </Badge>
            )}

            {/* Tags */}
            {task.tags?.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 h-[18px]">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Task Row (List View) ─────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onToggleComplete: (id: string, completed: boolean) => void
}

function TaskRow({ task, onEdit, onDelete, onStatusChange, onToggleComplete }: TaskRowProps) {
  const priCfg = PRIORITY_CONFIG[task.priority]
  const catCfg = CATEGORY_CONFIG[task.category]
  const overdue = task.dueDate ? isOverdue(task.dueDate) && !task.completed : false

  return (
    <motion.div
      layout
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="group"
    >
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 hover:bg-muted/60 border border-transparent hover:border-border ${task.completed ? 'opacity-50' : ''}`}>
        {/* Checkbox */}
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggleComplete(task.id, !task.completed)}
          className="shrink-0"
        />

        {/* Priority dot */}
        <span className={`h-2 w-2 rounded-full shrink-0 ${priCfg.dot}`} />

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </p>
        </div>

        {/* Category badge */}
        <Badge
          variant="secondary"
          className={`text-[10px] px-1.5 py-0 h-5 border-0 shrink-0 ${catCfg.bg} ${catCfg.text}`}
        >
          {catCfg.label}
        </Badge>

        {/* Due date */}
        {task.dueDate && (
          <span className={`text-xs shrink-0 flex items-center gap-1 ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
            <CalendarDays className="h-3 w-3" />
            {formatDateShort(task.dueDate)}
          </span>
        )}

        {/* Status badge */}
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${STATUS_CONFIG[task.status].color}`}
        >
          {STATUS_CONFIG[task.status].label}
        </Badge>

        {/* Hover actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)}>
                <Pencil className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(task.id)}>
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onToggleComplete: (id: string, completed: boolean) => void
  onQuickAdd: (title: string, status: TaskStatus) => void
}

function KanbanColumn({ status, tasks, onEdit, onDelete, onStatusChange, onToggleComplete, onQuickAdd }: KanbanColumnProps) {
  const cfg = STATUS_CONFIG[status]

  return (
    <div className={`flex flex-col rounded-xl border ${cfg.border} ${cfg.bg} min-h-0`}>
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-inherit shrink-0">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
          <h3 className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</h3>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-2">
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onToggleComplete={onToggleComplete}
              />
            ))}
          </AnimatePresence>

          {tasks.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 text-muted-foreground"
            >
              <Circle className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-xs">No tasks here</p>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Quick add */}
      <div className="px-2 pb-2 shrink-0">
        <QuickAddInput status={status} onAdd={onQuickAdd} />
      </div>
    </div>
  )
}

// ─── List Section (collapsible) ───────────────────────────────────────────────

interface ListSectionProps {
  title: string
  icon: React.ReactNode
  tasks: Task[]
  defaultOpen?: boolean
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onToggleComplete: (id: string, completed: boolean) => void
}

function ListSection({ title, icon, tasks, defaultOpen = true, onEdit, onDelete, onStatusChange, onToggleComplete }: ListSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-1 py-2 hover:bg-muted/50 rounded-md transition-colors"
      >
        {icon}
        <h3 className="text-sm font-semibold flex-1 text-left">{title}</h3>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {tasks.length}
        </Badge>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-0.5"
          >
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onToggleComplete={onToggleComplete}
              />
            ))}
          </motion.div>
        )}

        {isOpen && tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-4 text-center text-xs text-muted-foreground"
          >
            No tasks in this group
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TasksView() {
  const { tasks, addTask, updateTask, deleteTask, addXP } = useAppStore()

  // View & filter state
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('priority')
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [defaultDialogStatus, setDefaultDialogStatus] = useState<TaskStatus>('todo')

  // ─── Filtered & sorted tasks ──────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    const today = getTodayStr()

    return tasks
      .filter((task) => {
        // Search filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          const matchesTitle = task.title.toLowerCase().includes(q)
          const matchesDesc = task.description?.toLowerCase().includes(q)
          const matchesTags = task.tags?.some((t) => t.toLowerCase().includes(q))
          if (!matchesTitle && !matchesDesc && !matchesTags) return false
        }

        // Category filter
        if (categoryFilter !== 'all' && task.category !== categoryFilter) return false

        // Time filter
        if (filterMode === 'today') {
          return task.dueDate === today
        }
        if (filterMode === 'upcoming') {
          return !!task.dueDate && isUpcoming(task.dueDate)
        }

        return true
      })
      .sort((a, b) => {
        // Always put completed at bottom
        if (a.completed !== b.completed) return a.completed ? 1 : -1

        switch (sortMode) {
          case 'priority':
            return (PRIORITY_CONFIG[a.priority]?.order ?? 3) - (PRIORITY_CONFIG[b.priority]?.order ?? 3)
          case 'dueDate':
            if (!a.dueDate && !b.dueDate) return 0
            if (!a.dueDate) return 1
            if (!b.dueDate) return -1
            return a.dueDate.localeCompare(b.dueDate)
          case 'createdDate':
            return b.createdAt.localeCompare(a.createdAt)
          default:
            return 0
        }
      })
  }, [tasks, searchQuery, categoryFilter, filterMode, sortMode])

  // ─── Kanban grouped tasks ─────────────────────────────────────────────

  const kanbanGroups = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      'todo': [],
      'in-progress': [],
      'done': [],
    }
    filteredTasks.forEach((task) => {
      groups[task.status].push(task)
    })
    return groups
  }, [filteredTasks])

  // ─── List grouped tasks ───────────────────────────────────────────────

  const listGroups = useMemo(() => {
    const today = getTodayStr()
    const todayTasks: Task[] = []
    const upcomingTasks: Task[] = []
    const noDateTasks: Task[] = []

    filteredTasks.forEach((task) => {
      if (!task.dueDate) {
        noDateTasks.push(task)
      } else if (task.dueDate === today) {
        todayTasks.push(task)
      } else {
        const date = new Date(task.dueDate + 'T00:00:00')
        const todayDate = new Date(today + 'T00:00:00')
        if (date < todayDate) {
          todayTasks.push(task) // overdue tasks show in today
        } else {
          upcomingTasks.push(task)
        }
      }
    })

    return { todayTasks, upcomingTasks, noDateTasks }
  }, [filteredTasks])

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback((id: string) => {
    deleteTask(id)
  }, [deleteTask])

  const handleStatusChange = useCallback((id: string, status: TaskStatus) => {
    const task = tasks.find(t => t.id === id)
    const wasNotDone = task && task.status !== 'done'
    updateTask(id, { status, completed: status === 'done' })
    if (status === 'done' && wasNotDone) addXP(10)
  }, [updateTask, tasks, addXP])

  const handleToggleComplete = useCallback((id: string, completed: boolean) => {
    updateTask(id, {
      completed,
      status: completed ? 'done' : 'todo',
    })
    if (completed) addXP(10)
  }, [updateTask, addXP])

  const handleQuickAdd = useCallback((title: string, status: TaskStatus) => {
    addTask({
      title,
      priority: 'medium',
      category: 'study',
      status,
      completed: status === 'done',
    })
  }, [addTask])

  const handleAddTask = useCallback(() => {
    setEditingTask(null)
    setDefaultDialogStatus('todo')
    setDialogOpen(true)
  }, [])

  // ─── Stats ────────────────────────────────────────────────────────────

  const totalTasks = filteredTasks.length
  const completedTasks = filteredTasks.filter(t => t.completed).length

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <motion.div
      className="flex flex-col h-full min-h-0"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="shrink-0 space-y-3 pb-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">Tasks</h1>
            <Badge variant="secondary" className="text-xs">
              {completedTasks}/{totalTasks} done
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              <Button
                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5"
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Kanban</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5"
                onClick={() => setViewMode('list')}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </Button>
            </div>

            <Button onClick={handleAddTask} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Task</span>
            </Button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time filter */}
          <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
            <TabsList className="h-7">
              <TabsTrigger value="all" className="text-xs px-2.5 h-5">All</TabsTrigger>
              <TabsTrigger value="today" className="text-xs px-2.5 h-5">Today</TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs px-2.5 h-5">Upcoming</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category filter */}
          <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
            <TabsList className="h-7">
              <TabsTrigger value="all" className="text-xs px-2.5 h-5">All</TabsTrigger>
              <TabsTrigger value="study" className="text-xs px-2.5 h-5 gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                Study
              </TabsTrigger>
              <TabsTrigger value="work" className="text-xs px-2.5 h-5 gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                Work
              </TabsTrigger>
              <TabsTrigger value="personal" className="text-xs px-2.5 h-5 gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Personal
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sort */}
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger size="sm" className="h-7 w-[130px] text-xs gap-1">
              <SortAsc className="h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="createdDate">Created Date</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1 min-w-[140px] max-w-[220px] ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-8 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'kanban' ? (
          /* ── Kanban View ─────────────────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            {STATUS_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={kanbanGroups[status]}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onToggleComplete={handleToggleComplete}
                onQuickAdd={handleQuickAdd}
              />
            ))}
          </div>
        ) : (
          /* ── List View ───────────────────────────────────────────────── */
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-2">
              {/* Today */}
              <ListSection
                title="Today"
                icon={<CalendarDays className="h-4 w-4 text-amber-500 shrink-0" />}
                tasks={listGroups.todayTasks}
                defaultOpen={true}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onToggleComplete={handleToggleComplete}
              />

              {/* Upcoming */}
              <ListSection
                title="Upcoming"
                icon={<CalendarClock className="h-4 w-4 text-sky-500 shrink-0" />}
                tasks={listGroups.upcomingTasks}
                defaultOpen={true}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onToggleComplete={handleToggleComplete}
              />

              {/* No Date */}
              <ListSection
                title="No Date"
                icon={<CalendarX className="h-4 w-4 text-muted-foreground shrink-0" />}
                tasks={listGroups.noDateTasks}
                defaultOpen={true}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onToggleComplete={handleToggleComplete}
              />

              {/* Quick add in list view */}
              <div className="pt-2">
                <QuickAddInput status="todo" onAdd={handleQuickAdd} />
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* ── Task Dialog ──────────────────────────────────────────────────── */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingTask={editingTask}
        defaultStatus={defaultDialogStatus}
      />
    </motion.div>
  )
}
