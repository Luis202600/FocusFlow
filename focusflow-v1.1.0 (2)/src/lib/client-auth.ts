/**
 * Client-side authentication using localStorage
 * This allows the app to work on Vercel (serverless) without a database.
 * Passwords are hashed with SHA-256 + salt for security.
 */

export interface StoredUser {
  id: string
  email: string
  passwordHash: string
  name: string
  avatar: string | null
  createdAt: string
}

export interface SessionData {
  userId: string
  name: string
  email: string
  avatar: string | null
  expiresAt: string
}

const USERS_KEY = 'focusflow-users'
const SESSION_KEY = 'focusflow-session'

const encoder = new TextEncoder()

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function generateSalt(): string {
  return generateId() + generateId()
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return `${salt}:${hashHex}`
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':')
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hash === hashHex
}

// Get all users from localStorage
function getUsers(): StoredUser[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(USERS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

// Save users to localStorage
function saveUsers(users: StoredUser[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

// Get current session from localStorage
export function getSession(): SessionData | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(SESSION_KEY)
    if (!data) return null
    const session: SessionData = JSON.parse(data)
    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

// Save session to localStorage
function saveSession(session: SessionData): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

// Remove session from localStorage
export function clearSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
}

// Register a new user
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; user?: { id: string; name: string; email: string; avatar: string | null }; error?: string }> {
  // Validation
  if (!email || !password || !name) {
    return { success: false, error: 'All fields are required' }
  }
  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' }
  }
  if (name.length < 2) {
    return { success: false, error: 'Name must be at least 2 characters' }
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email format' }
  }

  const users = getUsers()
  const normalizedEmail = email.toLowerCase()
  
  if (users.some(u => u.email === normalizedEmail)) {
    return { success: false, error: 'An account with this email already exists' }
  }

  const salt = generateSalt()
  const passwordHash = await hashPassword(password, salt)
  const now = new Date().toISOString()

  const newUser: StoredUser = {
    id: generateId(),
    email: normalizedEmail,
    passwordHash,
    name,
    avatar: null,
    createdAt: now,
  }

  users.push(newUser)
  saveUsers(users)

  // Create session (30 days)
  const session: SessionData = {
    userId: newUser.id,
    name: newUser.name,
    email: newUser.email,
    avatar: newUser.avatar,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
  saveSession(session)

  return {
    success: true,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, avatar: newUser.avatar },
  }
}

// Login a user
export async function loginUser(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<{ success: boolean; user?: { id: string; name: string; email: string; avatar: string | null }; error?: string }> {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }

  const users = getUsers()
  const normalizedEmail = email.toLowerCase()
  const user = users.find(u => u.email === normalizedEmail)

  if (!user) {
    return { success: false, error: 'Invalid email or password' }
  }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    return { success: false, error: 'Invalid email or password' }
  }

  // Create session
  const days = rememberMe ? 90 : 30
  const session: SessionData = {
    userId: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
  }
  saveSession(session)

  return {
    success: true,
    user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
  }
}

// Logout
export function logoutUser(): void {
  clearSession()
}
