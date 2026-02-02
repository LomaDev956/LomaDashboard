'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { downloadBackup, uploadAndImportBackup } from '@/lib/data-backup';

export function DataBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      await downloadBackup();
      setMessage({ type: 'success', text: 'Backup descargado exitosamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al exportar datos: ' + (error as Error).message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);
    try {
      const result = await uploadAndImportBackup(file);
      if (result.success && result.mode === 'server') {
        setMessage({
          type: 'success',
          text: 'Datos importados al servidor. Se verán en todos los dispositivos. Recarga la página para ver los cambios.',
        });
      } else if (result.success && result.mode === 'local') {
        setMessage({
          type: 'success',
          text: 'Datos importados solo en este navegador (servidor no disponible). Para que se vean en todos lados, configura la base de datos del servidor e importa de nuevo.',
        });
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Error al importar. Verifica el formato del archivo.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al importar datos: ' + (error as Error).message });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Respaldo de Datos
          </CardTitle>
          <CardDescription>
            Exporta e importa todos tus datos (herramientas, garantías, personal). Si el servidor está configurado, al importar el JSON los datos se suben al servidor y se ven en todos los dispositivos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Exportar Datos</Label>
              <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exportando...' : 'Descargar Backup'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Descarga un archivo JSON con todos tus datos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-file">Importar Datos</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
              />
              <p className="text-sm text-muted-foreground">
                {isImporting ? 'Importando...' : 'Selecciona un archivo de backup JSON. Se subirá al servidor si está disponible.'}
              </p>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> La importación reemplazará todos los datos existentes. 
              Asegúrate de hacer un backup antes de importar.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}