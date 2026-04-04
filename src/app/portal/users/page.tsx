'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Edit, Trash2, Key, ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useRealtimeInvalidate } from '@/hooks/use-realtime'

interface User {
  id: string
  username: string
  name: string
  email: string
  role: 'admin' | 'employee' | 'client'
  status: 'active' | 'inactive'
  createdAt: string
}

export default function UsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'employee' as 'admin' | 'employee' | 'client'
  })
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useRealtimeInvalidate('users', fetchUsers)

  const handleAddUser = async () => {
    if (!formData.username || !formData.password || !formData.name || !formData.email) {
      toast({
        title: 'Error',
        description: 'Todos los campos son requeridos',
        variant: 'destructive'
      })
      return
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        const newUser = await res.json()
        setUsers([...users, newUser])
        setIsAddDialogOpen(false)
        setFormData({ username: '', name: '', email: '', password: '', role: 'employee' })
        toast({
          title: 'Usuario creado',
          description: `${newUser.name} ha sido agregado exitosamente`,
        })
      } else {
        const error = await res.json()
        toast({
          title: 'Error',
          description: error.error || 'Error al crear usuario',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedUser.id, ...formData })
      })

      if (res.ok) {
        const updatedUser = await res.json()
        setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u))
        setIsEditDialogOpen(false)
        toast({
          title: 'Usuario actualizado',
          description: 'Los cambios se han guardado correctamente',
        })
      } else {
        const error = await res.json()
        toast({
          title: 'Error',
          description: error.error || 'Error al actualizar usuario',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return

    try {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId))
        toast({
          title: 'Usuario eliminado',
          description: 'El usuario ha sido eliminado del sistema',
        })
      } else {
        const error = await res.json()
        toast({
          title: 'Error',
          description: error.error || 'Error al eliminar usuario',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    }
  }

  const handleChangePassword = async () => {
    if (!selectedUser) return

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive'
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive'
      })
      return
    }

    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          currentPassword: 'admin123', // En producción, pedir contraseña actual
          newPassword: passwordData.newPassword
        })
      })

      if (res.ok) {
        setIsPasswordDialogOpen(false)
        setPasswordData({ newPassword: '', confirmPassword: '' })
        toast({
          title: 'Contraseña actualizada',
          description: 'La contraseña se ha cambiado exitosamente',
        })
      } else {
        const error = await res.json()
        toast({
          title: 'Error',
          description: error.error || 'Error al cambiar contraseña',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    }
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      employee: 'bg-blue-100 text-blue-800',
      client: 'bg-green-100 text-green-800'
    }
    return colors[role as keyof typeof colors] || colors.employee
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push('/portal')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Portal
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Gestión de Usuarios</CardTitle>
                <CardDescription>Administra los usuarios del sistema</CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Nuevo Usuario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    <DialogDescription>Completa los datos del nuevo usuario</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Usuario</Label>
                      <Input
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="usuario123"
                      />
                    </div>
                    <div>
                      <Label>Nombre Completo</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="usuario@ejemplo.com"
                      />
                    </div>
                    <div>
                      <Label>Contraseña</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <Label>Rol</Label>
                      <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="employee">Empleado</SelectItem>
                          <SelectItem value="client">Cliente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddUser} className="w-full">
                      Crear Usuario
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadge(user.role)}>
                        {user.role === 'admin' ? 'Admin' : user.role === 'employee' ? 'Empleado' : 'Cliente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user)
                            setIsPasswordDialogOpen(true)
                          }}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user)
                            setFormData({
                              username: user.username,
                              name: user.name,
                              email: user.email,
                              password: '',
                              role: user.role
                            })
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.username !== 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
              <DialogDescription>Modifica los datos del usuario</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre Completo</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Rol</Label>
                <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleEditUser} className="w-full">
                Guardar Cambios
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Contraseña</DialogTitle>
              <DialogDescription>
                Cambiar contraseña de {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nueva Contraseña</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                />
              </div>
              <div>
                <Label>Confirmar Contraseña</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
              </div>
              <Button onClick={handleChangePassword} className="w-full">
                Cambiar Contraseña
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
