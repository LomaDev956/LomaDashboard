import type { NextRequest } from 'next/server'

/**
 * Flag Secure de la cookie `session` (login, logout, sign-out).
 *
 * Debe coincidir con lo que el **proceso Node** ve: tras Cloudflare Tunnel / proxy
 * la URL suele ser `http://127.0.0.1:...` aunque el usuario entre por https://dominio.
 * En ese caso Secure=false es correcto: el navegador sigue en HTTPS y envía la cookie
 * en peticiones al mismo host. Forzar Secure=true con X-Forwarded-Proto rompió el login
 * en algunos despliegues.
 *
 * Si en el futuro Node recibe TLS directo (https en request.url), Secure pasará a true.
 */
export function sessionCookieSecureFromRequest(request: NextRequest): boolean {
  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return false
  }
}

/** Reservado para server actions sin URL completa; mantener false = misma política que túnel HTTP→Node. */
export function sessionCookieSecureFromHeaders(_h: Headers): boolean {
  return false
}

const BASE_DELETE =
  'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'

/** Dos Set-Cookie por si quedó variante con o sin Secure. */
export function appendSessionCookieDeletes(headers: Headers): void {
  headers.append('Set-Cookie', BASE_DELETE)
  headers.append('Set-Cookie', `${BASE_DELETE}; Secure`)
}
