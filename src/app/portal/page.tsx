'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/actions/auth'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Wrench, 
  Users, 
  Settings, 
  FolderOpen, 
  LogOut,
  Shield,
  Database,
  Activity,
  Globe,
  ServerCog
} from 'lucide-react'

export default function PortalPage() {
  const router = useRouter()
  const [isPendingSignOut, startSignOutTransition] = useTransition()
  const [user] = useState({ name: 'Admin', role: 'admin' })

  const handleLogout = () => {
    startSignOutTransition(() => {
      void signOut()
    })
  }

  const apps = [
    {
      id: 'loma-tools',
      name: 'LOMA Tools',
      description: 'Sistema de gestión de garantías y herramientas',
      icon: Wrench,
      url: '/loma-dashboard',
      color: 'from-cyan-400 to-blue-500',
      enabled: true
    },
    {
      id: 'server-health',
      name: 'Salud del servidor',
      description:
        'CPU, memoria, disco, PM2, procesos, log del watchdog y actualizaciones apt',
      icon: ServerCog,
      url: '/portal/server-health',
      color: 'from-teal-400 to-cyan-600',
      enabled: user.role === 'admin'
    },
    {
      id: 'users',
      name: 'Gestión de Usuarios',
      description: 'Administrar usuarios y permisos del sistema',
      icon: Users,
      url: '/portal/users',
      color: 'from-purple-400 to-pink-500',
      enabled: user.role === 'admin'
    },
    {
      id: 'files',
      name: 'Archivos Compartidos',
      description: 'Subir y descargar documentos desde cualquier lugar',
      icon: FolderOpen,
      url: '/portal/files',
      color: 'from-green-400 to-emerald-500',
      enabled: true
    },
    {
      id: 'security',
      name: 'Seguridad',
      description: 'Cambiar contraseña y configuración de seguridad',
      icon: Shield,
      url: '/portal/security',
      color: 'from-red-400 to-orange-500',
      enabled: true
    },
    {
      id: 'settings',
      name: 'Configuración',
      description: 'Ajustes generales del sistema',
      icon: Settings,
      url: '/portal/settings',
      color: 'from-gray-400 to-gray-600',
      enabled: user.role === 'admin'
    },
    {
      id: 'pihole',
      name: 'Pi-hole (DNS / Bloqueo de anuncios)',
      description: 'Administrar el bloqueador de anuncios en red',
      icon: Globe,
      url: '/portal/pihole',
      color: 'from-amber-400 to-orange-500',
      enabled: true
    },
  ]

  const enabledAppCount = apps.filter((app) => app.enabled).length

  const stats = [
    { label: 'Apps Activas', value: String(enabledAppCount), color: 'text-cyan-400' },
    { label: 'Usuarios', value: '5', color: 'text-green-400' },
    { label: 'Archivos', value: '0', color: 'text-purple-400' },
    { label: 'Estado', value: 'Online', color: 'text-orange-400' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 overflow-hidden relative">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Floating Particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between backdrop-blur-sm bg-black/30 border border-cyan-500/20 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg animate-pulse"></div>
              <div className="absolute inset-0.5 bg-black rounded-lg flex items-center justify-center">
                <Database className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Portal LomaDev</h1>
              <p className="text-gray-400 mt-1">Bienvenido, <span className="text-cyan-400">{user.name}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {user.role === 'admin' && (
              <Button
                variant="outline"
                asChild
                className="border-teal-500/40 text-teal-300 hover:bg-teal-500/10 hover:text-teal-200"
              >
                <Link href="/portal/server-health">
                  <ServerCog className="h-4 w-4 mr-2" />
                  Salud del servidor
                </Link>
              </Button>
            )}
            <Button 
              variant="outline"
              disabled={isPendingSignOut}
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 hover:border-cyan-400/50 transition-all"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isPendingSignOut ? 'Cerrando…' : 'Cerrar Sesión'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={stat.label} className="bg-black/50 backdrop-blur-sm border-2 border-cyan-500/20 hover:border-cyan-400/50 transition-all duration-300 group">
              <CardContent className="pt-6">
                <div className="text-center relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
                  <div className={`text-3xl font-bold ${stat.color} relative z-10`}>{stat.value}</div>
                  <div className="text-sm text-gray-400 mt-1 relative z-10">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Apps Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Mis Aplicaciones</h2>
          <p className="text-gray-400 mb-6">Selecciona una aplicación para comenzar</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.filter(app => app.enabled).map((app) => (
              <Card key={app.id} className="bg-gradient-to-b from-gray-900 to-black border-2 border-cyan-500/20 hover:border-cyan-400/50 transition-all duration-500 group overflow-hidden relative cursor-pointer" onClick={() => router.push(app.url)}>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <CardHeader className="relative z-10">
                  <div className={`w-12 h-12 bg-gradient-to-r ${app.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <app.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white group-hover:text-cyan-400 transition-colors">{app.name}</CardTitle>
                  <CardDescription className="text-gray-400">{app.description}</CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-cyan-500/50 transition-all">
                    Abrir Aplicación
                  </Button>
                </CardContent>

                {/* Corner decoration */}
                <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-cyan-500/20 group-hover:border-cyan-400/50 transition-colors"></div>
              </Card>
            ))}
          </div>
        </div>

        {/* System Status */}
        <Card className="bg-black/50 backdrop-blur-sm border-2 border-cyan-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Activity className="h-5 w-5 text-cyan-400" />
              Estado del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-gray-400">Todos los servicios operando normalmente</p>
                <p className="text-xs text-gray-500">Última actualización: {new Date().toLocaleString('es-ES')}</p>
                {user.role === 'admin' && (
                  <p className="pt-2">
                    <Link
                      href="/portal/server-health"
                      className="text-sm font-medium text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-cyan-500/50 hover:decoration-cyan-400"
                    >
                      Ver salud del servidor: CPU, PM2, procesos, log del watchdog y paquetes apt →
                    </Link>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <span className="text-sm font-medium text-green-400">Online</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
