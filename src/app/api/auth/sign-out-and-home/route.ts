import { NextRequest, NextResponse } from 'next/server'
import { appendSessionCookieDeletes, sessionCookieSecureFromRequest } from '@/lib/session-cookie'

/**
 * Cierra sesión y redirige a /. Usado desde la server action signOut para poder
 * enviar varias cabeceras Set-Cookie (Secure / no Secure) tras túneles/proxies.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/'
  url.search = ''
  const res = NextResponse.redirect(url)
  const secure = sessionCookieSecureFromRequest(request)
  res.cookies.set('session', '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  })
  appendSessionCookieDeletes(res.headers)
  return res
}
