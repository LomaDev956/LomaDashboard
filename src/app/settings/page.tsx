
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/camclick/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, FolderOpen, AlertTriangle, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [selectedDirectoryName, setSelectedDirectoryName] = useState<string | null>(null);
  const [fsApiSupported, setFsApiSupported] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      setFsApiSupported(true);
    }
    const storedDirName = localStorage.getItem('lomatoolscapture_selectedDirectoryName');
    if (storedDirName) {
      setSelectedDirectoryName(storedDirName);
    }
  }, []);

  const handleSelectDirectory = async () => {
    if (!fsApiSupported) {
      toast({
        variant: "destructive",
        title: "Navegador no compatible",
        description: "Tu navegador no soporta la selección de directorios para guardado.",
      });
      return;
    }

    try {
      // Type assertion for window.showDirectoryPicker
      const windowWithPicker = window as any;
      const dirHandle = await windowWithPicker.showDirectoryPicker({
        mode: 'readwrite' // Solicitar permisos de lectura y escritura
      });
      setSelectedDirectoryName(dirHandle.name);
      localStorage.setItem('lomatoolscapture_selectedDirectoryName', dirHandle.name);
      // IMPORTANTE: Guardar `dirHandle` para uso futuro requeriría IndexedDB.
      // localStorage no puede almacenar este tipo de objeto.
      // Por ahora, solo guardamos el nombre como indicador.
      setPermissionError(null); 
      toast({
        title: "Carpeta Seleccionada (Experimental)",
        description: `Has seleccionado "${dirHandle.name}". Esta función es experimental. El guardado automático en esta carpeta aún NO está implementado. Las descargas seguirán el comportamiento estándar.`,
      });
    } catch (err) {
      console.error("Error selecting directory:", err);
      if (err instanceof Error && err.name === 'AbortError') {
        toast({
          variant: "default",
          title: "Selección Cancelada",
          description: "No se seleccionó ninguna carpeta.",
        });
      } else if (err instanceof Error && (err.name === 'SecurityError' || err.name === 'NotAllowedError')) {
        const msg = "Permiso denegado para acceder al directorio. Asegúrate de que la página se sirva sobre HTTPS y que no estés en un iframe que lo restrinja.";
        setPermissionError(msg);
        toast({
          variant: "destructive",
          title: "Error de Permiso",
          description: msg,
        });
      } else {
        const msg = "No se pudo seleccionar la carpeta. Inténtalo de nuevo.";
        setPermissionError(msg);
        toast({
          variant: "destructive",
          title: "Error al Seleccionar Carpeta",
          description: msg,
        });
      }
      setSelectedDirectoryName(null); 
      localStorage.removeItem('lomatoolscapture_selectedDirectoryName');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader 
        title="LomaToolsCapture"
        icon={<Camera className="h-8 w-8 text-primary" />}
        homePath="/capture" 
      />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="mb-6">
          <Link href="/capture" passHref> 
            <Button variant="outline" size="sm" className="hover:bg-accent hover:text-accent-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Captura
            </Button>
          </Link>
        </div>
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Ajustes de Captura de Imágenes</CardTitle>
            <CardDescription>
              Configura las preferencias de la herramienta de captura de imágenes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Ubicación de Guardado de Imágenes</h3>
              <div className="p-4 rounded-md bg-muted/50 border border-input space-y-3">
                <p className="text-sm text-foreground">
                  <strong>Método Estándar (Actual):</strong> Al descargar una imagen, tu navegador te permitirá elegir dónde guardarla o la guardará en tu carpeta de descargas predeterminada.
                </p>
                
                {fsApiSupported ? (
                  <>
                    <p className="text-sm text-foreground">
                      <strong>Selección de Carpeta (Experimental para futuro uso):</strong> Puedes seleccionar una carpeta. En una futura actualización, la aplicación podría intentar usar esta selección para ofrecer un guardado más directo. <strong>Actualmente, esto NO habilita el guardado automático.</strong>
                    </p>
                    <Button onClick={handleSelectDirectory} variant="outline" size="sm">
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Seleccionar Carpeta (Experimental)
                    </Button>
                    {selectedDirectoryName && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        Carpeta seleccionada: <strong>{selectedDirectoryName}</strong>.
                        <br />
                        <span className="text-xs text-muted-foreground">
                          (Nota: El guardado automático en esta carpeta aún no está implementado. Las descargas seguirán el comportamiento estándar del navegador.)
                        </span>
                      </p>
                    )}
                    {permissionError && (
                       <Alert variant="destructive" className="mt-3">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Error de Permiso o Selección</AlertTitle>
                         <AlertDescription>{permissionError}</AlertDescription>
                       </Alert>
                    )}
                     <p className="text-xs text-muted-foreground mt-2">
                        Esta función utiliza la File System Access API, que requiere un navegador moderno (Chrome, Edge, Opera) y que la página se sirva de forma segura (HTTPS). Es posible que necesites conceder permisos persistentes si tu navegador lo ofrece. Recordar la selección de carpeta entre sesiones de forma robusta requiere una implementación más avanzada (ej. IndexedDB).
                    </p>
                  </>
                ) : (
                  <Alert variant="default" className="mt-3">
                     <AlertTriangle className="h-4 w-4" />
                     <AlertTitle>Selección Avanzada de Carpeta no Disponible</AlertTitle>
                     <AlertDescription>
                       Tu navegador actual no es compatible con la selección de carpetas para un guardado más directo. Las imágenes se descargarán usando el método estándar.
                     </AlertDescription>
                   </Alert>
                )}
                 <p className="text-sm text-foreground mt-3">
                  Si necesitas una organización específica, te recomendamos crear las carpetas manualmente en tu sistema y mover allí las imágenes descargadas.
                </p>
              </div>
            </div>
            
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
