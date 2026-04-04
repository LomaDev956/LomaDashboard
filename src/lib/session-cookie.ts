import type { NextRequest } from 'next/server'

/**
 * Misma regla en login, logout API y signOut (server action).
 * Tras Cloudflare Tunnel / proxy, `request.url` suele ser http→Node aunque el usuario use https;
 * `x-forwarded-proto` refleja lo que ve el navegador.
 */
function protoLooksHttps(h: Headers): boolean {
  const xf = h.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  if (xf === 'https') return true
  const cf = h.get('cf-visitor')
  if (cf && /"scheme"\s*:\s*"https"/i.test(cf)) return true
  if (h.get('x-forwarded-ssl') === 'on') return true
  const fwd = h.get('forwarded')
  if (fwd && /proto=https/i.test(fwd)) return true
  return false
}

export function sessionCookieSecureFromRequest(request: NextRequest): boolean {
  if (request.nextUrl.protocol === 'https:') return true
  return protoLooksHttps(request.headers)
}

/** Para server actions: solo headers (sin NextRequest). */
export function sessionCookieSecureFromHeaders(h: Headers): boolean {
  return protoLooksHttps(h)
}

const BASE_DELETE = 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'

/** Dos Set-Cookie por si la sesión quedó con o sin Secure (túnel vs URL interna). */
export function appendSessionCookieDeletes(headers: Headers): void {
  headers.append('Set-Cookie', BASE_DELETE)
  headers.append('Set-Cookie', `${BASE_DELETE}; Secure`)
}
