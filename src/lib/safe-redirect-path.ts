/** Evita open redirect: solo rutas internas relativas. */
export function safeInternalPath(from: string | null | undefined, fallback: string): string {
  if (from == null || from === '') return fallback
  const t = from.trim()
  if (!t.startsWith('/') || t.startsWith('//') || t.includes('://')) return fallback
  return t
}
