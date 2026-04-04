'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Key, Shield, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

export default function SecurityPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    // En producción, obtener usuario actual del session
    setCurrentUser({
      id: '1',
      username: 'admin',
      role: 'Administrador'
    })
  }, [])

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Todos los campos son obligatorios',
        variant: 'destructive'
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive'
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser?.username || 'admin',
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim()
        })
      })

      if (res.ok) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        toast({
          title: 'Contraseña actualizada',
          description: 'Inicia sesión con tu nueva contraseña',
        })
        // Cerrar sesión para forzar login con la nueva contraseña
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login?from=/portal')
        return
      }

      // Mensaje de error del servidor (evita "Error de conexión" cuando la API responde con HTML u otro formato)
      let errorMessage = 'Error al cambiar contraseña'
      try {
        const data = await res.json()
        if (data?.error) errorMessage = data.error
      } catch {
        if (res.status === 404) errorMessage = 'Ruta no encontrada. ¿Actualizaste el código en el servidor?'
        else if (res.status >= 500) errorMessage = 'Error del servidor. Revisa los logs en el servidor.'
        else errorMessage = `Error (${res.status})`
      }
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '' }
    if (password.length < 6) return { strength: 25, label: 'Débil', color: 'bg-red-500' }
    if (password.length < 10) return { strength: 50, label: 'Media', color: 'bg-yellow-500' }
    if (password.length < 14) return { strength: 75, label: 'Fuerte', color: 'bg-blue-500' }
    return { strength: 100, label: 'Muy Fuerte', color: 'bg-green-500' }
  }

  const strength = passwordStrength(newPassword)

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
          {/* Change Password Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Key className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Cambiar Contraseña</CardTitle>
                  <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current">Contraseña Actual</Label>
                <Input
                  id="current"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <Label htmlFor="new">Nueva Contraseña</Label>
                <Input
                  id="new"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Fortaleza:</span>
                      <span className={`font-semibold ${strength.color.replace('bg-', 'text-')}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${strength.color}`}
                        style={{ width: `${strength.strength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="confirm">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button 
                onClick={handleChangePassword} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
              </Button>
            </CardContent>
          </Card>

          {/* Security Tips */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Consejos de Seguridad</CardTitle>
                  <CardDescription>Mantén tu cuenta segura</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  'Usa al menos 8 caracteres en tu contraseña',
                  'Combina letras mayúsculas, minúsculas, números y símbolos',
                  'No uses información personal fácil de adivinar',
                  'Cambia tu contraseña regularmente',
                  'No compartas tu contraseña con nadie',
                  'Usa contraseñas diferentes para cada servicio'
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{tip}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Información de la Cuenta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Usuario:</span>
                  <span className="font-semibold">{currentUser?.username || 'admin'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Rol:</span>
                  <span className="font-semibold">{currentUser?.role || 'Administrador'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Último acceso:</span>
                  <span className="font-semibold">{new Date().toLocaleString('es-MX')}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Estado:</span>
                  <span className="font-semibold text-green-600">Activo</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
