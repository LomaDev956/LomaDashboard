import { NextResponse } from 'next/server'

/**
 * Client ID de OAuth para Google Sign-In / Drive en el cliente.
 * Se expone por API para no depender de haber hecho build con NEXT_PUBLIC_*.
 * El ID de cliente web es público por diseño (igual que en el JS de Google).
 */
export async function GET() {
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_OAUTH_WEB_CLIENT_ID?.trim() ||
    ''
  return NextResponse.json({ clientId: clientId || null })
}
