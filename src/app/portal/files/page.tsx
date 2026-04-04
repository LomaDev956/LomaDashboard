'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Upload, Download, Trash2, ArrowLeft, File, FileText, Image, FileArchive, Loader2, RefreshCw, Eye, Link2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useRealtimeInvalidate } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

interface FileItem {
  id: string
  name: string
  originalName: string
  path: string
  size: number
  mimeType: string
  uploadedBy: string
  createdAt: string
  user?: {
    name: string
    username: string
  }
}

export default function FilesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [files, setFiles] = useState<FileItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({})
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  const [syncing, setSyncing] = useState(false)

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files')
      if (res.ok) {
        const data = await res.json()
        setFiles(data)
      }
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  useRealtimeInvalidate('files', fetchFiles)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) return

    setUploading(true)
    const fileNames = Array.from(selectedFiles).map(f => f.name)
    setUploadingFiles(fileNames)
    
    try {
      for (const file of Array.from(selectedFiles)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('uploadedBy', '1') // ID del usuario admin, en producción obtener del session

        // Crear XMLHttpRequest para tracking de progreso
        const xhr = new XMLHttpRequest()
        
        // Tracking de progreso
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100)
            setUploadProgress(prev => ({ ...prev, [file.name]: percentComplete }))
          }
        })

        // Promesa para manejar la subida
        const uploadPromise = new Promise((resolve, reject) => {
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText))
            } else {
              reject(new Error(`Error ${xhr.status}`))
            }
          })
          xhr.addEventListener('error', () => reject(new Error('Error de red')))
          xhr.addEventListener('abort', () => reject(new Error('Subida cancelada')))
        })

        xhr.open('POST', '/api/files')
        xhr.send(formData)

        try {
          const newFile = await uploadPromise
          setFiles(prev => [newFile as FileItem, ...prev])
          
          toast({
            title: 'Archivo subido',
            description: `${file.name} subido exitosamente`,
          })
        } catch (error) {
          toast({
            title: 'Error',
            description: `Error al subir ${file.name}`,
            variant: 'destructive'
          })
        }
        
        // Limpiar progreso
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[file.name]
          return newProgress
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
      setUploadingFiles([])
      setUploadProgress({})
      // Reset input
      e.target.value = ''
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/files/sync')
      const data = await res.json()
      if (res.ok) {
        await fetchFiles()
        toast({
          title: data.added > 0 ? 'Lista actualizada' : 'Lista al día',
          description: data.added > 0 ? data.message : 'No hay archivos nuevos en la carpeta.',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Error al sincronizar',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión al sincronizar',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const getFileUrl = (file: FileItem) => {
    if (typeof window === 'undefined') return file.path
    return `${window.location.origin}${file.path}`
  }

  const isImageFile = (file: FileItem) => {
    const t = (file.mimeType || '').toLowerCase()
    if (t.startsWith('image/')) return true
    const ext = (file.originalName || file.name || '').split('.').pop()?.toLowerCase()
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext || '')
  }

  const handlePreview = (file: FileItem) => {
    const url = getFileUrl(file)
    window.open(url, '_blank', 'noopener,noreferrer')
    toast({
      title: 'Vista previa',
      description: 'Se abrió en una nueva pestaña. Puedes copiar la URL de la barra de direcciones para abrirla en otro navegador.',
    })
  }

  const handleCopyLink = async (file: FileItem) => {
    const url = getFileUrl(file)
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: 'Enlace copiado',
        description: 'Pega la URL en otro navegador o dispositivo para abrir el archivo.',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo copiar. Abre "Vista previa" y copia la URL de la barra de direcciones.',
        variant: 'destructive',
      })
    }
  }

  const handleDownload = (file: FileItem) => {
    const link = document.createElement('a')
    link.href = file.path
    link.download = file.originalName
    link.click()
    toast({
      title: 'Descargando',
      description: `Descargando ${file.originalName}`,
    })
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm('¿Estás seguro de eliminar este archivo?')) return

    try {
      const res = await fetch(`/api/files?id=${fileId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setFiles(files.filter(f => f.id !== fileId))
        toast({
          title: 'Archivo eliminado',
          description: 'El archivo ha sido eliminado',
        })
      } else {
        const error = await res.json()
        toast({
          title: 'Error',
          description: error.error || 'Error al eliminar archivo',
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-600" />
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-600" />
    if (type.includes('zip') || type.includes('rar') || type.includes('x-rar')) 
      return <FileArchive className="h-5 w-5 text-yellow-600" />
    if (type.includes('iso') || type.includes('x-iso9660'))
      return <FileArchive className="h-5 w-5 text-purple-600" />
    if (type.includes('octet-stream'))
      return <File className="h-5 w-5 text-orange-600" />
    return <File className="h-5 w-5 text-gray-600" />
  }

  const getTotalSize = () => {
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0)
    return formatFileSize(totalBytes)
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
                <CardTitle className="text-2xl">Archivos Compartidos</CardTitle>
                <CardDescription>Sube y descarga archivos desde cualquier dispositivo</CardDescription>
              </div>
              <div>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSync}
                    disabled={syncing || uploading}
                  >
                    <RefreshCw className={cn('h-4 w-4 mr-2', syncing && 'animate-spin')} />
                    {syncing ? 'Sincronizando...' : 'Actualizar lista'}
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Subiendo...' : 'Subir Archivos'}
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Barra de progreso de subida */}
            {uploadingFiles.length > 0 && (
              <div className="mb-6 space-y-3">
                <h3 className="font-semibold text-sm text-gray-700">Subiendo archivos...</h3>
                {uploadingFiles.map((fileName) => (
                  <div key={fileName} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 truncate max-w-xs">{fileName}</span>
                      <span className="text-blue-600 font-semibold">
                        {uploadProgress[fileName] || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress[fileName] || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay archivos</h3>
                <p className="text-gray-600 mb-4">Sube tu primer archivo para comenzar</p>
                <Button 
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  Subir Archivo
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Archivo</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Subido Por</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.mimeType)}
                          <span className="font-medium">{file.originalName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(file.size)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{file.user?.name || 'Usuario'}</Badge>
                      </TableCell>
                      <TableCell>{new Date(file.createdAt).toLocaleString('es-MX')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          {isImageFile(file) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreview(file)}
                              title="Vista previa"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(file)}
                            title="Copiar enlace (abrir en otro navegador)"
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(file)}
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(file.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Storage Info */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{files.length}</div>
                <div className="text-sm text-gray-600 mt-1">Archivos Totales</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {getTotalSize()}
                </div>
                <div className="text-sm text-gray-600 mt-1">Espacio Usado</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">Ilimitado</div>
                <div className="text-sm text-gray-600 mt-1">Espacio Disponible</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
