import { db } from './db'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

// Password hashing using Web Crypto API
const encoder = new TextEncoder()

async function hashPassword(password: string): Promise<string> {
  const salt = randomUUID()
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

// Session management
const SESSION_DURATION_DAYS = 30
const REMEMBER_ME_DURATION_DAYS = 90

function generateSessionToken(): string {
  return randomUUID() + '-' + randomUUID() + '-' + randomUUID()
}

async function createSession(userId: string, days: number = SESSION_DURATION_DAYS): Promise<string> {
  const token = generateSessionToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  await db.session.create({
    data: {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }
  })

  return token
}

async function getSessionFromToken(token: string): Promise<{ userId: string; name: string; email: string; avatar: string | null } | null> {
  const session = await db.session.findUnique({
    where: { token },
  })

  if (!session) return null

  // Check expiration
  if (new Date(session.expiresAt) < new Date()) {
    await db.session.delete({ where: { token } })
    return null
  }

  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  }
}

async function deleteSession(token: string): Promise<void> {
  try {
    await db.session.delete({ where: { token } })
  } catch {
    // Session might not exist, that's fine
  }
}

// Cookie helpers
const SESSION_COOKIE_NAME = 'focusflow-session'

function getSessionCookieMaxAge(days: number = SESSION_DURATION_DAYS): number {
  return days * 24 * 60 * 60
}

export {
  hashPassword,
  verifyPassword,
  createSession,
  getSessionFromToken,
  deleteSession,
  generateSessionToken,
  SESSION_COOKIE_NAME,
  getSessionCookieMaxAge,
  SESSION_DURATION_DAYS,
  REMEMBER_ME_DURATION_DAYS,
}
