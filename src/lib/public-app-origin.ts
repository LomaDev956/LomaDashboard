import type { NextRequest } from 'next/server'

function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, '')
}

function hostLooksLoopback(host: string): boolean {
  const h = host.split(':')[0]?.toLowerCase() ?? ''
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '[::1]'
}

/**
 * Origen público (ej. https://lomadev.com) para Location en redirecciones.
 * Con túnel Cloudflare → Node, `request.url` / `nextUrl` suelen ser http://127.0.0.1:3000;
 * el header Host o X-Forwarded-Host lleva el dominio real del usuario.
 */
export function publicAppOriginFromRequest(request: NextRequest): string {
  const fromEnv =
    stripTrailingSlash(process.env.LOMA_PUBLIC_ORIGIN ?? '') ||
    stripTrailingSlash(process.env.NEXT_PUBLIC_APP_URL ?? '')

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const hostHeader = request.headers.get('host')?.trim()
  const host = forwardedHost || hostHeader || request.nextUrl.host

  if (hostLooksLoopback(host) && fromEnv) {
    return fromEnv
  }

  let proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    (request.headers.get('x-forwarded-ssl') === 'on' ? 'https' : '')

  if (!proto) {
    try {
      proto = new URL(request.url).protocol === 'https:' ? 'https' : 'http'
    } catch {
      proto = 'http'
    }
  }
  if (proto.endsWith(':')) proto = proto.slice(0, -1)

  if (hostLooksLoopback(host) && !fromEnv) {
    return request.nextUrl.origin
  }

  return `${proto}://${host}`
}
