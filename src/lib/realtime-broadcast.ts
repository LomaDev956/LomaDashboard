/**
 * Broadcast en tiempo real vía Server-Sent Events (SSE).
 * Cuando una API modifica datos, llama broadcast() y todos los clientes
 * conectados reciben el evento y pueden refrescar su vista.
 * Solo funciona con un solo proceso (ej. PM2 con una instancia).
 */

export type RealtimeResource = 'users' | 'files' | 'pos' | 'garantias' | 'tools' | 'herramientas' | 'personal' | 'global'

export interface RealtimeEvent {
  type: 'invalidate'
  resource: RealtimeResource
  at?: string // ISO timestamp
}

type Writer = (data: string) => void

const clients = new Set<Writer>()

export function subscribe(write: Writer): () => void {
  clients.add(write)
  return () => {
    clients.delete(write)
  }
}

export function broadcast(event: RealtimeEvent): void {
  const payload = JSON.stringify({ ...event, at: new Date().toISOString() })
  const data = `data: ${payload}\n\n`
  const dead: Writer[] = []
  clients.forEach((write) => {
    try {
      write(data)
    } catch {
      dead.push(write)
    }
  })
  dead.forEach((w) => clients.delete(w))
}

export function getClientCount(): number {
  return clients.size
}
