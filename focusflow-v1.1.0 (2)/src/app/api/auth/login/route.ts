import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, SESSION_COOKIE_NAME, getSessionCookieMaxAge, SESSION_DURATION_DAYS, REMEMBER_ME_DURATION_DAYS } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password, rememberMe } = await req.json()

    // Validation
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Find user
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Determine session duration based on rememberMe
    const sessionDays = rememberMe ? REMEMBER_ME_DURATION_DAYS : SESSION_DURATION_DAYS

    // Create session
    const token = await createSession(user.id, sessionDays)

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar }
    })

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: getSessionCookieMaxAge(sessionDays),
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
