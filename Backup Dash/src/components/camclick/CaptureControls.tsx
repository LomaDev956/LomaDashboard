
"use client";

import { useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CaptureControlsProps {
  onOpenCameraPreview: () => void;
  onImageFileSelected: (imageDataUrl: string) => void;
}

export function CaptureControls({ onOpenCameraPreview, onImageFileSelected }: CaptureControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Archivo no Válido",
          description: "Por favor, selecciona un archivo de imagen (ej. PNG, JPG).",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        onImageFileSelected(imageDataUrl);
      };
      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Error al Cargar Imagen",
          description: "No se pudo leer el archivo seleccionado.",
        });
      }
      reader.readAsDataURL(file);
    }
    // Reset file input to allow selecting the same file again if needed
    if (event.target) {
      event.target.value = '';
    }
  };

  return (
    <div className="mb-8 flex flex-col items-center w-full gap-4 sm:flex-row sm:justify-center">
      <Button onClick={onOpenCameraPreview} size="lg" aria-label="Abrir Cámara">
        <Camera className="mr-2 h-5 w-5" />
        Abrir Cámara
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <Button onClick={handleUploadClick} size="lg" variant="outline" aria-label="Cargar Imagen">
        <Upload className="mr-2 h-5 w-5" />
        Cargar Imagen
      </Button>
      <p className="mt-2 text-sm text-muted-foreground sm:hidden text-center col-span-full">
        Abre la cámara o carga una imagen para capturar y extraer información.
      </p>
    </div>
  );
}
