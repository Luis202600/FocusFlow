import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Types
export type ViewType = 'dashboard' | 'planner' | 'study' | 'tasks' | 'habits' | 'ai' | 'stats' | 'settings' | 'journal' | 'achievements' | 'focus' | 'deep-study'

export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type Category = 'study' | 'work' | 'personal'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  category: Category
  dueDate?: string
  dueTime?: string
  tags?: string[]
  order: number
  parentId?: string
  completed: boolean
  xpClaimed?: boolean // Track if XP was already awarded for this task
  recurring?: RecurringConfig
  createdAt: string
  updatedAt: string
}

export interface RecurringConfig {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  daysOfWeek?: number[]
  dayOfMonth?: number
  interval?: number
}

export interface Subject {
  id: string
  name: string
  color: string
  icon?: string
  progress: number
  topics: Topic[]
  createdAt: string
  updatedAt: string
}

export interface Topic {
  id: string
  subjectId: string
  name: string
  progress: number
  notes?: string
  reviewCount: number
  nextReview?: string
  completed: boolean
  xpClaimed?: boolean
  createdAt: string
  updatedAt: string
}

export interface StudySession {
  id: string
  subjectId?: string
  topicId?: string
  subjectName?: string
  type: 'pomodoro' | 'free' | 'deep-work' | 'deep-study'
  duration: number
  completed: boolean
  startedAt: string
  endedAt?: string
  createdAt: string
}

export interface Habit {
  id: string
  name: string
  icon?: string
  color: string
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom'
  targetCount: number
  logs: HabitLog[]
  createdAt: string
  updatedAt: string
}

export interface HabitLog {
  id: string
  habitId: string
  date: string
  completed: boolean
  count: number
}

export interface TimeBlock {
  id: string
  title: string
  startTime: string
  endTime: string
  category: Category | 'break'
  date: string
  taskId?: string
  completed: boolean
  xpClaimed?: boolean
  order: number
}

export interface PomodoroState {
  isRunning: boolean
  isPaused: boolean
  mode: 'work' | 'break' | 'long-break'
  timeLeft: number
  round: number
  subjectId?: string
  topicId?: string
}

export interface UserSettings {
  name: string
  pomodoroWork: number
  pomodoroBreak: number
  pomodoroLongBreak: number
  pomodoroRounds: number
  dayStartTime: string
  dayEndTime: string
  level: number
  xp: number
  streak: number
  onboardingDone: boolean
  soundEnabled: boolean
  focusModeEnabled: boolean
}

// Journal types
export interface JournalEntry {
  id: string
  date: string
  content: string
  mood?: 'great' | 'good' | 'okay' | 'bad' | 'awful'
  gratitudes?: string[]
  createdAt: string
  updatedAt: string
}

// Achievement types
export interface Achievement {
  id: string
  key: string
  title: string
  description: string
  icon: string
  color: string
  unlockedAt?: string
  category: 'tasks' | 'study' | 'habits' | 'streak' | 'special'
  requirement: number
}

// Auth types
export interface AuthUser {
  id: string
  name: string
  email: string
  avatar: string | null
}

// Chat types
export interface ChatAttachment {
  id: string
  name: string
  type: 'image' | 'file'
  url: string
  size?: number
}

export interface GeneratedFile {
  id: string
  name: string
  type: 'txt' | 'pptx'
  url: string
  size: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  attachments?: ChatAttachment[]
  generatedFiles?: GeneratedFile[]
  actions?: AIAction[]
}

// AI Action types - what the AI can do
export interface AIAction {
  type: 'add_task' | 'complete_task' | 'delete_task' | 'add_time_block' | 'complete_time_block' | 'add_habit' | 'add_subject' | 'add_topic'
  data: Record<string, unknown>
  executed: boolean
}

// App State
interface AppState {
  // Auth
  isAuthenticated: boolean
  user: AuthUser | null
  setAuth: (user: AuthUser) => void
  clearAuth: () => void

  // Navigation
  currentView: ViewType
  setCurrentView: (view: ViewType) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void

  // Tasks
  tasks: Task[]
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'xpClaimed'>) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  reorderTasks: (tasks: Task[]) => void
  completeTask: (id: string) => void // New: completes task, awards XP once, then removes

  // Subjects
  subjects: Subject[]
  addSubject: (subject: Omit<Subject, 'id' | 'createdAt' | 'updatedAt' | 'topics' | 'progress'>) => void
  updateSubject: (id: string, updates: Partial<Subject>) => void
  deleteSubject: (id: string) => void

  // Topics
  addTopic: (subjectId: string, topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt' | 'subjectId' | 'progress' | 'reviewCount' | 'completed' | 'xpClaimed'>) => void
  updateTopic: (subjectId: string, topicId: string, updates: Partial<Topic>) => void
  deleteTopic: (subjectId: string, topicId: string) => void
  completeTopic: (subjectId: string, topicId: string) => void

  // Study Sessions
  studySessions: StudySession[]
  addStudySession: (session: Omit<StudySession, 'id' | 'createdAt'>) => void

  // Habits
  habits: Habit[]
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'logs'>) => void
  updateHabit: (id: string, updates: Partial<Habit>) => void
  deleteHabit: (id: string) => void
  toggleHabitLog: (habitId: string, date: string) => void

  // Time Blocks
  timeBlocks: TimeBlock[]
  addTimeBlock: (block: Omit<TimeBlock, 'id' | 'order' | 'xpClaimed'>) => void
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>) => void
  deleteTimeBlock: (id: string) => void
  completeTimeBlock: (id: string) => void

  // Pomodoro
  pomodoro: PomodoroState
  setPomodoro: (updates: Partial<PomodoroState>) => void
  resetPomodoro: () => void

  // Settings
  settings: UserSettings
  updateSettings: (updates: Partial<UserSettings>) => void

  // UI
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  chatMessages: ChatMessage[]
  addChatMessage: (message: ChatMessage) => void
  clearChat: () => void

  // Focus Mode
  focusModeActive: boolean
  setFocusModeActive: (active: boolean) => void

  // Journal
  journalEntries: JournalEntry[]
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void
  deleteJournalEntry: (id: string) => void

  // Achievements
  achievements: Achievement[]
  checkAchievements: () => void
  unlockAchievement: (key: string) => void

  // Data management
  resetAllData: () => void
  exportData: () => string
  importData: (json: string) => boolean
  addXP: (amount: number) => void
}

export interface ExportData {
  tasks: Task[]
  subjects: Subject[]
  studySessions: StudySession[]
  habits: Habit[]
  timeBlocks: TimeBlock[]
  settings: UserSettings
  chatMessages: ChatMessage[]
  journalEntries: JournalEntry[]
  achievements: Achievement[]
  exportedAt: string
  version: string
}

const defaultSettings: UserSettings = {
  name: '',
  pomodoroWork: 25,
  pomodoroBreak: 5,
  pomodoroLongBreak: 15,
  pomodoroRounds: 4,
  dayStartTime: '06:00',
  dayEndTime: '22:00',
  level: 1,
  xp: 0,
  streak: 0,
  onboardingDone: false,
  soundEnabled: true,
  focusModeEnabled: false,
}

const defaultPomodoro: PomodoroState = {
  isRunning: false,
  isPaused: false,
  mode: 'work',
  timeLeft: 25 * 60,
  round: 1,
}

const defaultAchievements: Achievement[] = [
  { id: 'a1', key: 'first_task', title: 'First Step', description: 'Create your first task', icon: '🎯', color: '#7c3aed', category: 'tasks', requirement: 1, unlockedAt: undefined },
  { id: 'a2', key: 'task_master_10', title: 'Getting Started', description: 'Complete 10 tasks', icon: '✅', color: '#059669', category: 'tasks', requirement: 10, unlockedAt: undefined },
  { id: 'a3', key: 'task_master_50', title: 'Task Master', description: 'Complete 50 tasks', icon: '🏆', color: '#f59e0b', category: 'tasks', requirement: 50, unlockedAt: undefined },
  { id: 'a4', key: 'task_master_100', title: 'Productivity Legend', description: 'Complete 100 tasks', icon: '👑', color: '#ef4444', category: 'tasks', requirement: 100, unlockedAt: undefined },
  { id: 'a5', key: 'first_session', title: 'Scholar', description: 'Complete your first study session', icon: '📚', color: '#2563eb', category: 'study', requirement: 1, unlockedAt: undefined },
  { id: 'a6', key: 'study_10h', title: 'Dedicated Learner', description: 'Study for 10 total hours', icon: '🧠', color: '#7c3aed', category: 'study', requirement: 10, unlockedAt: undefined },
  { id: 'a7', key: 'study_50h', title: 'Knowledge Seeker', description: 'Study for 50 total hours', icon: '🎓', color: '#0891b2', category: 'study', requirement: 50, unlockedAt: undefined },
  { id: 'a8', key: 'study_100h', title: 'Scholar Supreme', description: 'Study for 100 total hours', icon: '🔬', color: '#6366f1', category: 'study', requirement: 100, unlockedAt: undefined },
  { id: 'a9', key: 'first_habit', title: 'Habit Builder', description: 'Create your first habit', icon: '🌱', color: '#10b981', category: 'habits', requirement: 1, unlockedAt: undefined },
  { id: 'a10', key: 'habit_7day', title: 'Week Warrior', description: '7-day streak on any habit', icon: '🔥', color: '#f97316', category: 'habits', requirement: 7, unlockedAt: undefined },
  { id: 'a11', key: 'habit_30day', title: 'Habit Master', description: '30-day streak on any habit', icon: '💎', color: '#ec4899', category: 'habits', requirement: 30, unlockedAt: undefined },
  { id: 'a12', key: 'streak_3', title: 'On a Roll', description: '3-day activity streak', icon: '⚡', color: '#eab308', category: 'streak', requirement: 3, unlockedAt: undefined },
  { id: 'a13', key: 'streak_7', title: 'Unstoppable', description: '7-day activity streak', icon: '🚀', color: '#f97316', category: 'streak', requirement: 7, unlockedAt: undefined },
  { id: 'a14', key: 'streak_30', title: 'Iron Will', description: '30-day activity streak', icon: '💪', color: '#ef4444', category: 'streak', requirement: 30, unlockedAt: undefined },
  { id: 'a15', key: 'night_owl', title: 'Night Owl', description: 'Study after 10 PM', icon: '🦉', color: '#6366f1', category: 'special', requirement: 1, unlockedAt: undefined },
  { id: 'a16', key: 'early_bird', title: 'Early Bird', description: 'Study before 8 AM', icon: '🐦', color: '#f59e0b', category: 'special', requirement: 1, unlockedAt: undefined },
  { id: 'a17', key: 'journal_first', title: 'Reflective Mind', description: 'Write your first journal entry', icon: '📝', color: '#8b5cf6', category: 'special', requirement: 1, unlockedAt: undefined },
  { id: 'a18', key: 'level_5', title: 'Rising Star', description: 'Reach level 5', icon: '⭐', color: '#f59e0b', category: 'special', requirement: 5, unlockedAt: undefined },
  { id: 'a19', key: 'level_10', title: 'Champion', description: 'Reach level 10', icon: '🏅', color: '#ef4444', category: 'special', requirement: 10, unlockedAt: undefined },
]

// XP rewards
const XP_REWARDS = {
  TASK_COMPLETE: 25,
  TOPIC_COMPLETE: 50,
  TIME_BLOCK_COMPLETE: 15,
  STUDY_SESSION: 30,
  HABIT_LOG: 10,
} as const

export { XP_REWARDS }

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function now(): string {
  return new Date().toISOString()
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      isAuthenticated: false,
      user: null,
      setAuth: (user) => set({ isAuthenticated: true, user }),
      clearAuth: () => set({ isAuthenticated: false, user: null }),

      // Navigation
      currentView: 'dashboard',
      setCurrentView: (view) => set({ currentView: view }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Tasks
      tasks: [],
      addTask: (task) => set((state) => ({
        tasks: [...state.tasks, { ...task, id: generateId(), order: state.tasks.length, xpClaimed: false, createdAt: now(), updatedAt: now() }]
      })),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates, updatedAt: now() } : t)
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id)
      })),
      reorderTasks: (tasks) => set({ tasks }),
      completeTask: (id) => set((state) => {
        const task = state.tasks.find(t => t.id === id)
        if (!task || task.xpClaimed) {
          // Already claimed XP, just mark completed and remove after a delay
          return {
            tasks: state.tasks.filter(t => t.id !== id)
          }
        }
        // Award XP and remove task
        const xpAmount = task.priority === 'urgent' ? XP_REWARDS.TASK_COMPLETE * 2 :
                         task.priority === 'high' ? XP_REWARDS.TASK_COMPLETE * 1.5 :
                         XP_REWARDS.TASK_COMPLETE
        const roundedXP = Math.round(xpAmount)
        let newXP = state.settings.xp + roundedXP
        let newLevel = state.settings.level
        const xpNeeded = newLevel * 100
        if (newXP >= xpNeeded) {
          newXP = newXP - xpNeeded
          newLevel = newLevel + 1
        }
        return {
          tasks: state.tasks.filter(t => t.id !== id),
          settings: { ...state.settings, xp: newXP, level: newLevel }
        }
      }),

      // Subjects
      subjects: [],
      addSubject: (subject) => set((state) => ({
        subjects: [...state.subjects, { ...subject, id: generateId(), progress: 0, topics: [], createdAt: now(), updatedAt: now() }]
      })),
      updateSubject: (id, updates) => set((state) => ({
        subjects: state.subjects.map(s => s.id === id ? { ...s, ...updates, updatedAt: now() } : s)
      })),
      deleteSubject: (id) => set((state) => ({
        subjects: state.subjects.filter(s => s.id !== id)
      })),

      // Topics
      addTopic: (subjectId, topic) => set((state) => ({
        subjects: state.subjects.map(s => s.id === subjectId ? {
          ...s,
          topics: [...s.topics, { ...topic, id: generateId(), subjectId, progress: 0, reviewCount: 0, completed: false, xpClaimed: false, createdAt: now(), updatedAt: now() }]
        } : s)
      })),
      updateTopic: (subjectId, topicId, updates) => set((state) => ({
        subjects: state.subjects.map(s => s.id === subjectId ? {
          ...s,
          topics: s.topics.map(t => t.id === topicId ? { ...t, ...updates, updatedAt: now() } : t)
        } : s)
      })),
      deleteTopic: (subjectId, topicId) => set((state) => ({
        subjects: state.subjects.map(s => s.id === subjectId ? {
          ...s,
          topics: s.topics.filter(t => t.id !== topicId)
        } : s)
      })),
      completeTopic: (subjectId, topicId) => set((state) => {
        const subject = state.subjects.find(s => s.id === subjectId)
        const topic = subject?.topics.find(t => t.id === topicId)
        if (!topic || topic.xpClaimed) {
          // Remove the topic
          return {
            subjects: state.subjects.map(s => s.id === subjectId ? {
              ...s,
              topics: s.topics.filter(t => t.id !== topicId),
              progress: Math.round(((s.topics.filter(t => t.id !== topicId).filter(t => t.completed || t.xpClaimed).length) / Math.max(s.topics.filter(t => t.id !== topicId).length, 1)) * 100)
            } : s)
          }
        }
        // Award XP and remove
        let newXP = state.settings.xp + XP_REWARDS.TOPIC_COMPLETE
        let newLevel = state.settings.level
        const xpNeeded = newLevel * 100
        if (newXP >= xpNeeded) {
          newXP = newXP - xpNeeded
          newLevel = newLevel + 1
        }
        return {
          subjects: state.subjects.map(s => s.id === subjectId ? {
            ...s,
            topics: s.topics.filter(t => t.id !== topicId),
            progress: Math.round(((s.topics.filter(t => t.id !== topicId).filter(t => t.completed || t.xpClaimed).length) / Math.max(s.topics.filter(t => t.id !== topicId).length, 1)) * 100)
          } : s),
          settings: { ...state.settings, xp: newXP, level: newLevel }
        }
      }),

      // Study Sessions
      studySessions: [],
      addStudySession: (session) => set((state) => {
        let newXP = state.settings.xp + XP_REWARDS.STUDY_SESSION
        let newLevel = state.settings.level
        const xpNeeded = newLevel * 100
        if (newXP >= xpNeeded) {
          newXP = newXP - xpNeeded
          newLevel = newLevel + 1
        }
        return {
          studySessions: [...state.studySessions, { ...session, id: generateId(), createdAt: now() }],
          settings: { ...state.settings, xp: newXP, level: newLevel }
        }
      }),

      // Habits
      habits: [],
      addHabit: (habit) => set((state) => ({
        habits: [...state.habits, { ...habit, id: generateId(), logs: [], createdAt: now(), updatedAt: now() }]
      })),
      updateHabit: (id, updates) => set((state) => ({
        habits: state.habits.map(h => h.id === id ? { ...h, ...updates, updatedAt: now() } : h)
      })),
      deleteHabit: (id) => set((state) => ({
        habits: state.habits.filter(h => h.id !== id)
      })),
      toggleHabitLog: (habitId, date) => set((state) => ({
        habits: state.habits.map(h => {
          if (h.id !== habitId) return h
          const existingLog = h.logs.find(l => l.date === date)
          if (existingLog) {
            return {
              ...h,
              logs: h.logs.map(l => l.date === date ? { ...l, completed: !l.completed, count: l.completed ? 0 : 1 } : l)
            }
          }
          return {
            ...h,
            logs: [...h.logs, { id: generateId(), habitId, date, completed: true, count: 1 }]
          }
        })
      })),

      // Time Blocks
      timeBlocks: [],
      addTimeBlock: (block) => set((state) => ({
        timeBlocks: [...state.timeBlocks, { ...block, id: generateId(), xpClaimed: false, order: state.timeBlocks.length }]
      })),
      updateTimeBlock: (id, updates) => set((state) => ({
        timeBlocks: state.timeBlocks.map(b => b.id === id ? { ...b, ...updates } : b)
      })),
      deleteTimeBlock: (id) => set((state) => ({
        timeBlocks: state.timeBlocks.filter(b => b.id !== id)
      })),
      completeTimeBlock: (id) => set((state) => {
        const block = state.timeBlocks.find(b => b.id === id)
        if (!block || block.xpClaimed) {
          return {
            timeBlocks: state.timeBlocks.filter(b => b.id !== id)
          }
        }
        let newXP = state.settings.xp + XP_REWARDS.TIME_BLOCK_COMPLETE
        let newLevel = state.settings.level
        const xpNeeded = newLevel * 100
        if (newXP >= xpNeeded) {
          newXP = newXP - xpNeeded
          newLevel = newLevel + 1
        }
        return {
          timeBlocks: state.timeBlocks.filter(b => b.id !== id),
          settings: { ...state.settings, xp: newXP, level: newLevel }
        }
      }),

      // Pomodoro
      pomodoro: defaultPomodoro,
      setPomodoro: (updates) => set((state) => ({
        pomodoro: { ...state.pomodoro, ...updates }
      })),
      resetPomodoro: () => set({
        pomodoro: { ...defaultPomodoro, timeLeft: get().settings.pomodoroWork * 60 }
      }),

      // Settings
      settings: defaultSettings,
      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates }
      })),

      // Chat
      chatOpen: false,
      setChatOpen: (open) => set({ chatOpen: open }),
      chatMessages: [],
      addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, message]
      })),
      clearChat: () => set({ chatMessages: [] }),

      // Focus Mode
      focusModeActive: false,
      setFocusModeActive: (active) => set({ focusModeActive: active }),

      // Journal
      journalEntries: [],
      addJournalEntry: (entry) => set((state) => {
        const existing = state.journalEntries.find(e => e.date === entry.date)
        if (existing) {
          return {
            journalEntries: state.journalEntries.map(e =>
              e.date === entry.date
                ? { ...e, ...entry, updatedAt: now() }
                : e
            )
          }
        }
        return {
          journalEntries: [...state.journalEntries, { ...entry, id: generateId(), createdAt: now(), updatedAt: now() }]
        }
      }),
      updateJournalEntry: (id, updates) => set((state) => ({
        journalEntries: state.journalEntries.map(e => e.id === id ? { ...e, ...updates, updatedAt: now() } : e)
      })),
      deleteJournalEntry: (id) => set((state) => ({
        journalEntries: state.journalEntries.filter(e => e.id !== id)
      })),

      // Achievements
      achievements: defaultAchievements,
      unlockAchievement: (key) => set((state) => ({
        achievements: state.achievements.map(a =>
          a.key === key && !a.unlockedAt
            ? { ...a, unlockedAt: now() }
            : a
        )
      })),
      checkAchievements: () => {
        const state = get()
        const totalStudyHours = state.studySessions.filter(s => s.completed).reduce((acc, s) => acc + s.duration, 0) / 60
        const habitCount = state.habits.length
        const sessionCount = state.studySessions.filter(s => s.completed).length
        const journalCount = state.journalEntries.length
        const streak = state.settings.streak
        const level = state.settings.level

        // Count total completed actions (tasks removed + topics removed + blocks removed)
        const completedTaskCount = state.tasks.length // tasks that are still there
        const hasNightOwl = state.studySessions.some(s => {
          const hour = new Date(s.startedAt).getHours()
          return hour >= 22
        })
        const hasEarlyBird = state.studySessions.some(s => {
          const hour = new Date(s.startedAt).getHours()
          return hour < 8
        })

        const bestHabitStreak = state.habits.reduce((best, h) => {
          let streak = 0
          const sortedLogs = h.logs.filter(l => l.completed).sort((a, b) => b.date.localeCompare(a.date))
          for (let i = 0; i < 365; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]
            if (sortedLogs.some(l => l.date === dateStr)) {
              streak++
            } else {
              if (i === 0) continue
              break
            }
          }
          return Math.max(best, streak)
        }, 0)

        if (completedTaskCount >= 1) state.unlockAchievement('first_task')
        if (sessionCount >= 1) state.unlockAchievement('first_session')
        if (totalStudyHours >= 10) state.unlockAchievement('study_10h')
        if (totalStudyHours >= 50) state.unlockAchievement('study_50h')
        if (totalStudyHours >= 100) state.unlockAchievement('study_100h')
        if (habitCount >= 1) state.unlockAchievement('first_habit')
        if (bestHabitStreak >= 7) state.unlockAchievement('habit_7day')
        if (bestHabitStreak >= 30) state.unlockAchievement('habit_30day')
        if (streak >= 3) state.unlockAchievement('streak_3')
        if (streak >= 7) state.unlockAchievement('streak_7')
        if (streak >= 30) state.unlockAchievement('streak_30')
        if (hasNightOwl) state.unlockAchievement('night_owl')
        if (hasEarlyBird) state.unlockAchievement('early_bird')
        if (journalCount >= 1) state.unlockAchievement('journal_first')
        if (level >= 5) state.unlockAchievement('level_5')
        if (level >= 10) state.unlockAchievement('level_10')
      },

      // Data management
      resetAllData: () => set({
        tasks: [],
        subjects: [],
        studySessions: [],
        habits: [],
        timeBlocks: [],
        chatMessages: [],
        journalEntries: [],
        pomodoro: defaultPomodoro,
        settings: { ...defaultSettings, onboardingDone: true },
        achievements: defaultAchievements.map(a => ({ ...a, unlockedAt: undefined })),
        focusModeActive: false,
      }),

      exportData: () => {
        const state = get()
        const data: ExportData = {
          tasks: state.tasks,
          subjects: state.subjects,
          studySessions: state.studySessions,
          habits: state.habits,
          timeBlocks: state.timeBlocks,
          settings: state.settings,
          chatMessages: state.chatMessages,
          journalEntries: state.journalEntries,
          achievements: state.achievements,
          exportedAt: new Date().toISOString(),
          version: '1.1.0',
        }
        return JSON.stringify(data, null, 2)
      },

      importData: (json: string) => {
        try {
          const data: ExportData = JSON.parse(json)
          if (!data.version || !data.tasks) return false
          set({
            tasks: data.tasks || [],
            subjects: data.subjects || [],
            studySessions: data.studySessions || [],
            habits: data.habits || [],
            timeBlocks: data.timeBlocks || [],
            settings: data.settings || defaultSettings,
            chatMessages: data.chatMessages || [],
            journalEntries: data.journalEntries || [],
            achievements: data.achievements || defaultAchievements,
          })
          return true
        } catch {
          return false
        }
      },

      addXP: (amount: number) => set((state) => {
        let newXP = state.settings.xp + amount
        let newLevel = state.settings.level
        const xpNeeded = newLevel * 100
        if (newXP >= xpNeeded) {
          newXP = newXP - xpNeeded
          newLevel = newLevel + 1
        }
        return {
          settings: { ...state.settings, xp: newXP, level: newLevel }
        }
      }),
    }),
    {
      name: 'focusflow-storage',
      version: 4,
      partialize: (state) => ({
        tasks: state.tasks,
        subjects: state.subjects,
        studySessions: state.studySessions,
        habits: state.habits,
        timeBlocks: state.timeBlocks,
        settings: state.settings,
        chatMessages: state.chatMessages,
        journalEntries: state.journalEntries,
        achievements: state.achievements,
      }),
      migrate: (persistedState: Record<string, unknown>, version: number) => {
        if (version < 4) {
          // Add xpClaimed to existing tasks and time blocks
          const tasks = Array.isArray(persistedState.tasks) ? persistedState.tasks.map((t: Record<string, unknown>) => ({
            ...t, xpClaimed: t.xpClaimed || (t as Record<string, unknown>).completed || false
          })) : []
          const timeBlocks = Array.isArray(persistedState.timeBlocks) ? persistedState.timeBlocks.map((b: Record<string, unknown>) => ({
            ...b, xpClaimed: b.xpClaimed || (b as Record<string, unknown>).completed || false
          })) : []
          const subjects = Array.isArray(persistedState.subjects) ? persistedState.subjects.map((s: Record<string, unknown>) => ({
            ...s,
            topics: Array.isArray((s as Record<string, unknown>).topics)
              ? ((s as Record<string, unknown>).topics as Record<string, unknown>[]).map((t: Record<string, unknown>) => ({
                ...t, xpClaimed: t.xpClaimed || t.completed || false
              }))
              : []
          })) : []
          return {
            ...persistedState,
            tasks,
            subjects,
            timeBlocks,
            chatMessages: persistedState.chatMessages || [],
            journalEntries: persistedState.journalEntries || [],
            achievements: persistedState.achievements || defaultAchievements,
            settings: {
              ...defaultSettings,
              ...(typeof persistedState.settings === 'object' && persistedState.settings ? persistedState.settings : {}),
              soundEnabled: true,
              focusModeEnabled: false,
              onboardingDone: true,
            },
          }
        }
        return persistedState
      },
    }
  )
)
