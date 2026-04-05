/**
 * Sincronización entre pestañas del mismo navegador para el LOMA Dashboard.
 * Cuando una pestaña modifica datos (herramientas, personal, garantías),
 * notifica a las demás para que refresquen su vista.
 */

const CHANNEL_NAME = 'loma-dashboard-sync'

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null
  try {
    return new BroadcastChannel(CHANNEL_NAME)
  } catch {
    return null
  }
}

/** Llamar después de guardar/cambiar datos en el dashboard para que otras pestañas refresquen. */
export function notifyDashboardSync(): void {
  const ch = getChannel()
  if (ch) {
    ch.postMessage({ type: 'invalidate', at: Date.now() })
    ch.close()
  }
}
