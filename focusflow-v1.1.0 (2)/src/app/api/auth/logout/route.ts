import { NextRequest, NextResponse } from 'next/server'
import { deleteSession, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value

    if (token) {
      await deleteSession(token)
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete(SESSION_COOKIE_NAME)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
