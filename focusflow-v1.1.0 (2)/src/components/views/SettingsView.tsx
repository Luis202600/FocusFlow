'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Download,
  Upload,
  Trash2,
  Clock,
  User,
  Calendar,
  Info,
  AlertTriangle,
  Save,
  Timer,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { Switch } from '@/components/ui/switch'

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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

// ─── Section Wrapper ──────────────────────────────────────────────────────────

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Slider Row Helper ────────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-sm font-semibold tabular-nums text-foreground bg-muted px-2.5 py-0.5 rounded-md">
          {value}{unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(vals) => onChange(vals[0])}
        className="w-full"
      />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsView() {
  const { settings, updateSettings, resetAllData, exportData, importData } = useAppStore()

  // Local state for the name input so we can save it explicitly
  const [nameInput, setNameInput] = useState(settings.name)

  const handleSaveName = () => {
    updateSettings({ name: nameInput.trim() })
    toast.success('Name updated', {
      description: nameInput.trim()
        ? `Your greeting will now use "${nameInput.trim()}"`
        : 'Greeting will use a default name',
    })
  }

  const handleExport = () => {
    try {
      const json = exportData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `focusflow-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported', {
        description: 'Your backup file has been downloaded',
      })
    } catch {
      toast.error('Export failed', {
        description: 'Could not export your data. Please try again.',
      })
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const json = ev.target?.result as string
        const success = importData(json)
        if (success) {
          toast.success('Data imported', {
            description: 'Your data has been restored successfully',
          })
          // Sync the local name state after import
          const store = useAppStore.getState()
          setNameInput(store.settings.name)
        } else {
          toast.error('Import failed', {
            description: 'The file format is invalid. Please use a FocusFlow backup file.',
          })
        }
      }
      reader.onerror = () => {
        toast.error('Import failed', {
          description: 'Could not read the file. Please try again.',
        })
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleReset = () => {
    resetAllData()
    setNameInput('')
    toast.success('All data reset', {
      description: 'FocusFlow has been restored to its initial state',
    })
  }

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your preferences and data</p>
        </div>
      </motion.div>

      <Separator />

      {/* ── 1. Profile Section ───────────────────────────────────────────────── */}
      <SettingsSection
        icon={User}
        title="Profile"
        description="Customize how FocusFlow greets you"
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="settings-name" className="text-sm font-medium">
              Display Name
            </Label>
            <div className="flex gap-2">
              <Input
                id="settings-name"
                placeholder="Enter your name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName()
                }}
                className="flex-1"
              />
              <Button
                onClick={handleSaveName}
                size="default"
                className="shrink-0 gap-1.5"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This name is used in your daily greeting on the dashboard
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* ── 2. Pomodoro Timer Section ────────────────────────────────────────── */}
      <SettingsSection
        icon={Timer}
        title="Pomodoro Timer"
        description="Configure your focus and break durations"
      >
        <SliderRow
          label="Work Duration"
          value={settings.pomodoroWork}
          min={5}
          max={60}
          unit=" min"
          onChange={(val) => updateSettings({ pomodoroWork: val })}
        />

        <Separator />

        <SliderRow
          label="Break Duration"
          value={settings.pomodoroBreak}
          min={1}
          max={15}
          unit=" min"
          onChange={(val) => updateSettings({ pomodoroBreak: val })}
        />

        <Separator />

        <SliderRow
          label="Long Break Duration"
          value={settings.pomodoroLongBreak}
          min={5}
          max={30}
          unit=" min"
          onChange={(val) => updateSettings({ pomodoroLongBreak: val })}
        />

        <Separator />

        <SliderRow
          label="Rounds Before Long Break"
          value={settings.pomodoroRounds}
          min={1}
          max={8}
          onChange={(val) => updateSettings({ pomodoroRounds: val })}
        />
      </SettingsSection>

      {/* ── 3. Day Schedule Section ──────────────────────────────────────────── */}
      <SettingsSection
        icon={Calendar}
        title="Day Schedule"
        description="Set your active hours for planning and tracking"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="day-start" className="text-sm font-medium">
              Day Start Time
            </Label>
            <Input
              id="day-start"
              type="time"
              value={settings.dayStartTime}
              onChange={(e) => updateSettings({ dayStartTime: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              When your day begins
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="day-end" className="text-sm font-medium">
              Day End Time
            </Label>
            <Input
              id="day-end"
              type="time"
              value={settings.dayEndTime}
              onChange={(e) => updateSettings({ dayEndTime: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              When your day ends
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* ── 4. Notifications & Focus Section ────────────────────────────────── */}
      <SettingsSection
        icon={Timer}
        title="Notifications & Focus"
        description="Configure sound alerts and focus mode"
      >
        <div className="space-y-4">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </div>
              <div>
                <Label className="text-sm font-medium">Sound Notifications</Label>
                <p className="text-xs text-muted-foreground">Play a chime when Pomodoro sessions end</p>
              </div>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
            />
          </div>

          <Separator />

          {/* Focus Mode Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <Label className="text-sm font-medium">Focus Mode</Label>
                <p className="text-xs text-muted-foreground">Distraction-free fullscreen timer view</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const store = useAppStore.getState()
                store.setCurrentView('focus')
                store.setFocusModeActive(true)
              }}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Enter Focus
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ── 5. Data Management Section ───────────────────────────────────────── */}
      <SettingsSection
        icon={Clock}
        title="Data Management"
        description="Export, import, or reset your FocusFlow data"
      >
        <div className="space-y-3">
          {/* Export */}
          <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Download className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Export Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download all your tasks, habits, sessions, and settings as a JSON backup file
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} className="shrink-0 gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>

          {/* Import */}
          <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <Upload className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Import Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Restore your data from a previously exported FocusFlow backup file
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleImport} className="shrink-0 gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Import
            </Button>
          </div>

          {/* Reset */}
          <div className="flex items-start gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Reset All Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete all your tasks, subjects, habits, study sessions, and time blocks
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="shrink-0 gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <AlertDialogTitle>Reset All Data</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription className="pt-1">
                    This will permanently delete all your tasks, subjects, habits, study sessions, and time blocks. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    className="bg-destructive text-white shadow-xs hover:bg-destructive/90"
                  >
                    Yes, reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SettingsSection>

      {/* ── 6. About Section ─────────────────────────────────────────────────── */}
      <SettingsSection
        icon={Info}
        title="About FocusFlow"
        description="Your premium productivity companion"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-md">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base">FocusFlow</h3>
              <p className="text-xs text-muted-foreground">Version 2.0.0</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              FocusFlow is a premium productivity app designed to help you manage tasks,
              track study sessions, build habits, and stay focused with Pomodoro timers.
            </p>
            <p className="flex items-center gap-1">
              Made with <span className="text-red-500">&hearts;</span> for students and professionals
            </p>
          </div>
        </div>
      </SettingsSection>
    </motion.div>
  )
}
