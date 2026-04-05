'use client'

import { useEffect, useRef } from 'react'
import { notifyDashboardSync } from '../lib/dashboard-sync'

const CHANNEL_NAME = 'loma-dashboard-sync'

/**
 * Escucha notificaciones de otras pestañas del dashboard (mismo navegador).
 * Cuando otra pestaña modifica datos y llama notifyDashboardSync(), este hook
 * ejecuta onSync (ej. refetch) para mantener la vista actualizada.
 */
export function useDashboardSync(onSync: () => void): void {
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const ch = new BroadcastChannel(CHANNEL_NAME)
      const handler = () => {
        onSyncRef.current()
      }
      ch.addEventListener('message', handler)
      return () => {
        ch.removeEventListener('message', handler)
        ch.close()
      }
    } catch {
      return undefined
    }
  }, [])
}

export { notifyDashboardSync } from '../lib/dashboard-sync'
