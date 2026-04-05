import { NextRequest, NextResponse } from 'next/server'
import { appendSessionCookieDeletes, sessionCookieSecureFromRequest } from '@/lib/session-cookie'
import { publicAppOriginFromRequest } from '@/lib/public-app-origin'

/**
 * Cierra sesión y redirige a /. Usado desde la server action signOut para poder
 * enviar varias cabeceras Set-Cookie (Secure / no Secure) tras túneles/proxies.
 *
 * Importante: con Cloudflare Tunnel, `request.nextUrl` suele ser http://127.0.0.1:3000;
 * hay que usar Host / X-Forwarded-* o LOMA_PUBLIC_ORIGIN para no mandar al usuario a localhost.
 */
export async function GET(request: NextRequest) {
  const home = new URL('/', publicAppOriginFromRequest(request))
  const res = NextResponse.redirect(home)
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
