'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink, Wifi, Globe, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'

const PIHOLE_IP = '192.168.4.201'
const PIHOLE_LOCAL_URL = `http://${PIHOLE_IP}/admin`
const PIHOLE_PUBLIC_URL = 'https://pihole.lomadev.com/admin'

export default function PiHolePortalPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push('/portal')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Portal
          </Button>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Globe className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Pi-hole</CardTitle>
                  <CardDescription>Bloqueador de anuncios en red (DNS)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-gray-600">
                Pi-hole está instalado en tu servidor. Puedes abrir el panel de administración de estas dos formas:
              </p>

              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">En tu red local (casa/oficina)</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Si estás conectado a la misma red que el servidor (Wi‑Fi o cable), abre:
                  </p>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open(PIHOLE_LOCAL_URL, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {PIHOLE_LOCAL_URL}
                  </Button>
                </div>

                <div className="p-4 rounded-lg border bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">Desde internet (lomadev.com)</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Para abrir Pi-hole desde fuera de tu red, primero debes exponer el panel con Cloudflare Tunnel (subdominio <code className="bg-gray-100 px-1 rounded">pihole.lomadev.com</code> → puerto 80 del servidor). Luego podrás usar:
                  </p>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open(PIHOLE_PUBLIC_URL, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {PIHOLE_PUBLIC_URL}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Si aún no configuraste el túnel para Pi-hole, este enlace no funcionará hasta que lo hagas.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Contraseña del panel:</strong> la que te mostró el instalador de Pi-hole. Para cambiarla en el servidor: <code className="bg-amber-100 px-1 rounded">pihole -a -p</code>.
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Para que Pi-hole bloquee anuncios en toda la red, configura en el router el DNS con la IP del servidor: <strong>{PIHOLE_IP}</strong>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
