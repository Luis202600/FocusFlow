import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromToken, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const session = await getSessionFromToken(token)

    if (!session) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 })
      response.cookies.delete(SESSION_COOKIE_NAME)
      return response
    }

    return NextResponse.json({
      authenticated: true,
      user: session,
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
