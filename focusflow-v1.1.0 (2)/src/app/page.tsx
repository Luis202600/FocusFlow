'use client'

import { useAppStore, type ViewType, type AuthUser } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, Calendar, BookOpen, CheckSquare,
  Target, Bot, BarChart3, Sun, Moon, ChevronLeft,
  ChevronRight, Sparkles, Flame, Trophy, Settings,
  Search, Command, PenLine, LogOut, User, Brain
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useState, useSyncExternalStore, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import FloatingTimer from '@/components/ui/floating-timer'
import { getSession, logoutUser } from '@/lib/client-auth'

const DashboardView = dynamic(() => import('@/components/views/DashboardView'), { ssr: false })
const PlannerView = dynamic(() => import('@/components/views/PlannerView'), { ssr: false })
const StudyView = dynamic(() => import('@/components/views/StudyView'), { ssr: false })
const TasksView = dynamic(() => import('@/components/views/TasksView'), { ssr: false })
const HabitsView = dynamic(() => import('@/components/views/HabitsView'), { ssr: false })
const AIView = dynamic(() => import('@/components/views/AIView'), { ssr: false })
const StatsView = dynamic(() => import('@/components/views/StatsView'), { ssr: false })
const SettingsView = dynamic(() => import('@/components/views/SettingsView'), { ssr: false })
const FocusView = dynamic(() => import('@/components/views/FocusView'), { ssr: false })
const JournalView = dynamic(() => import('@/components/views/JournalView'), { ssr: false })
const AchievementsView = dynamic(() => import('@/components/views/AchievementsView'), { ssr: false })
const AuthView = dynamic(() => import('@/components/views/AuthView'), { ssr: false })
const DeepStudyView = dynamic(() => import('@/components/views/DeepStudyView'), { ssr: false })

const emptySubscribe = () => () => {}

const navItems: { view: ViewType; icon: React.ElementType; label: string; shortcut?: string }[] = [
  { view: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', shortcut: '1' },
  { view: 'planner', icon: Calendar, label: 'Planner', shortcut: '2' },
  { view: 'study', icon: BookOpen, label: 'Study', shortcut: '3' },
  { view: 'tasks', icon: CheckSquare, label: 'Tasks', shortcut: '4' },
  { view: 'habits', icon: Target, label: 'Habits', shortcut: '5' },
  { view: 'ai', icon: Bot, label: 'AI Assistant', shortcut: '6' },
  { view: 'stats', icon: BarChart3, label: 'Statistics', shortcut: '7' },
  { view: 'journal', icon: PenLine, label: 'Journal', shortcut: '8' },
  { view: 'achievements', icon: Trophy, label: 'Achievements', shortcut: '9' },
  { view: 'deep-study', icon: Brain, label: 'Deep Study' },
]

const viewComponents: Record<ViewType, React.ComponentType> = {
  dashboard: DashboardView,
  planner: PlannerView,
  study: StudyView,
  tasks: TasksView,
  habits: HabitsView,
  ai: AIView,
  stats: StatsView,
  settings: SettingsView,
  focus: FocusView,
  journal: JournalView,
  achievements: AchievementsView,
  'deep-study': DeepStudyView,
}

export default function Home() {
  const { currentView, setCurrentView, sidebarCollapsed, setSidebarCollapsed, settings, tasks, habits, updateSettings, isAuthenticated, user, setAuth, clearAuth } = useAppStore()
  const { theme, setTheme } = useTheme()

  // Hydration-safe mounted check
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  // Check session on mount
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const checkSession = () => {
      try {
        const session = getSession()
        if (session) {
          setAuth({
            id: session.userId,
            name: session.name,
            email: session.email,
            avatar: session.avatar,
          } as AuthUser)
        }
      } catch {
        // Not authenticated
      } finally {
        setCheckingSession(false)
      }
    }
    checkSession()
  }, [setAuth])

  // Command palette state
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandSearch, setCommandSearch] = useState('')

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(prev => !prev)
        setCommandSearch('')
      }
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement
        const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
        if (isInInput) return

        const num = parseInt(e.key)
        if (num >= 1 && num <= 9) {
          e.preventDefault()
          setCurrentView(navItems[num - 1].view)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setCurrentView])

  // Logout handler
  const handleLogout = () => {
    logoutUser()
    clearAuth()
  }

  if (!mounted || checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading FocusFlow...</p>
        </div>
      </div>
    )
  }

  // Show auth view if not authenticated
  if (!isAuthenticated) {
    return <AuthView />
  }

  const todayTasks = tasks.filter(t => t.dueDate === new Date().toISOString().split('T')[0])
  const completedToday = todayTasks.filter(t => t.completed).length
  const todayHabits = habits.filter(h => {
    const today = new Date().toISOString().split('T')[0]
    return h.logs.some(l => l.date === today && l.completed)
  }).length

  const ViewComponent = viewComponents[currentView]

  // Command palette items
  const commandItems = [
    ...navItems.map(n => ({ label: n.label, icon: n.icon, action: () => setCurrentView(n.view), shortcut: n.shortcut })),
    { label: 'Focus Mode', icon: Sparkles, action: () => setCurrentView('focus'), shortcut: undefined },
    { label: 'Settings', icon: Settings, action: () => setCurrentView('settings'), shortcut: undefined },
    { label: theme === 'dark' ? 'Light Mode' : 'Dark Mode', icon: theme === 'dark' ? Sun : Moon, action: () => setTheme(theme === 'dark' ? 'light' : 'dark'), shortcut: undefined },
  ]

  const filteredCommands = commandItems.filter(item =>
    item.label.toLowerCase().includes(commandSearch.toLowerCase())
  )

  const isFocusMode = currentView === 'focus' || currentView === 'deep-study'

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen flex bg-background">
        {/* Sidebar — hidden in focus mode */}
        {!isFocusMode && <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 64 : 220 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-border bg-card/80 backdrop-blur-xl"
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <span className="font-semibold text-base gradient-text">FocusFlow</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-2">
            <nav className="flex flex-col gap-0.5 px-2">
              {navItems.map(({ view, icon: Icon, label }) => {
                const isActive = currentView === view
                return (
                  <Tooltip key={view}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setCurrentView(view)}
                        className={`
                          flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium
                          transition-all duration-150 w-full text-left
                          ${isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          }
                        `}
                      >
                        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                        <AnimatePresence>
                          {!sidebarCollapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden whitespace-nowrap"
                            >
                              {label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {isActive && !sidebarCollapsed && (
                          <motion.div
                            layoutId="nav-indicator"
                            className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                          />
                        )}
                      </button>
                    </TooltipTrigger>
                    {sidebarCollapsed && (
                      <TooltipContent side="right" className="text-xs">
                        {label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                )
              })}
            </nav>
          </ScrollArea>

          {/* Bottom section */}
          <div className="border-t border-border p-2 space-y-1">
            {/* User info */}
            {!sidebarCollapsed && user && (
              <div className="px-2.5 py-2 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            )}

            {/* Level & XP */}
            {!sidebarCollapsed && (
              <div className="px-2.5 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Level {settings.level}</span>
                  <span className="ml-auto">{settings.xp} XP</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(settings.xp % 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            {/* Streak */}
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>{settings.streak} day streak</span>
              </div>
            )}

            <Separator className="my-1" />

            {/* Command palette trigger */}
            {!sidebarCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { setCommandOpen(true); setCommandSearch('') }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all w-full"
                  >
                    <Search className="w-[18px] h-[18px] flex-shrink-0" />
                    <span className="flex-1 text-left">Search</span>
                    <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
                  </button>
                </TooltipTrigger>
              </Tooltip>
            )}

            {/* Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all w-full ${
                    currentView === 'settings'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Settings className="w-[18px] h-[18px] flex-shrink-0" />
                  {!sidebarCollapsed && <span>Settings</span>}
                </button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" className="text-xs">
                  Settings
                </TooltipContent>
              )}
            </Tooltip>

            {/* Theme toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all w-full"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-[18px] h-[18px] flex-shrink-0" />
                  ) : (
                    <Moon className="w-[18px] h-[18px] flex-shrink-0" />
                  )}
                  {!sidebarCollapsed && (
                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  )}
                </button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" className="text-xs">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </TooltipContent>
              )}
            </Tooltip>

            {/* Logout */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full"
                >
                  <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                  {!sidebarCollapsed && <span>Log out</span>}
                </button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" className="text-xs">
                  Log out
                </TooltipContent>
              )}
            </Tooltip>

            {/* Collapse toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all w-full"
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="w-[18px] h-[18px] flex-shrink-0" />
                  ) : (
                    <ChevronLeft className="w-[18px] h-[18px] flex-shrink-0" />
                  )}
                  {!sidebarCollapsed && <span>Collapse</span>}
                </button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" className="text-xs">
                  Expand sidebar
                </TooltipContent>
              )}
            </Tooltip>

            {/* Version badge */}
            {!sidebarCollapsed && (
              <div className="px-2.5 pt-2 pb-1 text-center">
                <span className="text-[10px] text-muted-foreground/50 font-mono">v1.1.0</span>
              </div>
            )}
          </div>
        </motion.aside>}

        {/* Command Palette Overlay */}
        <AnimatePresence>
          {commandOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                onClick={() => setCommandOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.15 }}
                className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
              >
                <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                  {/* Search input */}
                  <div className="flex items-center gap-3 px-4 border-b border-border">
                    <Command className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Type a command or search..."
                      value={commandSearch}
                      onChange={(e) => setCommandSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setCommandOpen(false)
                        if (e.key === 'Enter' && filteredCommands.length > 0) {
                          filteredCommands[0].action()
                          setCommandOpen(false)
                        }
                      }}
                      className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">ESC</kbd>
                  </div>

                  {/* Results */}
                  <div className="max-h-72 overflow-y-auto p-2">
                    {filteredCommands.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No results found
                      </div>
                    ) : (
                      filteredCommands.map((item, i) => (
                        <button
                          key={item.label}
                          onClick={() => {
                            item.action()
                            setCommandOpen(false)
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-accent transition-colors text-left group"
                        >
                          <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          <span className="flex-1">{item.label}</span>
                          {item.shortcut && (
                            <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                              {item.shortcut}
                            </kbd>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main
          className="flex-1 transition-all duration-200"
          style={{ marginLeft: isFocusMode ? 0 : sidebarCollapsed ? 64 : 220 }}
        >
          {/* Top bar — hidden in focus mode */}
          {!isFocusMode && (
          <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-medium text-foreground">
                {currentView === 'settings' ? 'Settings' : isFocusMode ? 'Focus Mode' : navItems.find(n => n.view === currentView)?.label}
              </h1>
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span>{completedToday}/{todayTasks.length} tasks</span>
                <span>·</span>
                <span>{todayHabits}/{habits.length} habits</span>
              </div>
              {/* User avatar in header */}
              {user && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center cursor-pointer">
                      <span className="text-white text-xs font-bold">{user.name.charAt(0).toUpperCase()}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-muted-foreground">{user.email}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCommandOpen(true); setCommandSearch('') }}
                className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Search</span>
                <kbd className="hidden md:inline text-[10px] bg-muted px-1 py-0.5 rounded font-mono">⌘K</kbd>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('focus')}
                className="text-xs gap-1.5 text-violet-500 hover:text-violet-600"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Focus
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('ai')}
                className="text-xs gap-1.5 text-primary hover:text-primary"
              >
                <Bot className="w-3.5 h-3.5" />
                AI
              </Button>
            </div>
          </header>
          )}

          {/* View content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={isFocusMode ? 'h-screen' : 'h-[calc(100vh-3.5rem)]'}
            >
              <ViewComponent />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating timer — visible across all views when pomodoro is running */}
        <FloatingTimer />
      </div>
    </TooltipProvider>
  )
}
