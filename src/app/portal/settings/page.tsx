import { redirect } from 'next/navigation'

/** Enlace del portal a la configuración general de la app (captura, respaldos, etc.). */
export default function PortalSettingsPage() {
  redirect('/settings')
}
