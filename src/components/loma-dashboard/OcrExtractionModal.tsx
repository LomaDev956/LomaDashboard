
"use client";

import { useState, useRef, type ChangeEvent } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2, ScanSearch, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { extractBatteryInfo, type BatteryInfoInput, type BatteryInfoOutput } from '@/ai/flows/extractBatteryInfoFlow';
import { CameraPreviewModal } from '@/components/camclick/CameraPreviewModal'; // Reusing existing modal

interface OcrExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataExtracted: (data: BatteryInfoOutput) => void;
}

export function OcrExtractionModal({ isOpen, onClose, onDataExtracted }: OcrExtractionModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const resetModalState = () => {
    setImageDataUrl(null);
    setIsExtracting(false);
    setExtractionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const handleCloseModal = () => {
    resetModalState();
    onClose();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
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
      setExtractionError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageDataUrl(e.target?.result as string);
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
  };

  const handleImageFromCamera = (dataUrl: string) => {
    setExtractionError(null);
    setImageDataUrl(dataUrl);
    setIsCameraModalOpen(false);
    toast({ title: "Imagen Capturada", description: "Lista para extracción." });
  };

  const handleExtract = async () => {
    if (!imageDataUrl) {
      toast({ title: "Sin Imagen", description: "Carga o captura una imagen primero.", variant: "warning" });
      return;
    }
    setIsExtracting(true);
    setExtractionError(null);
    try {
      const input: BatteryInfoInput = { imageDataUri: imageDataUrl };
      const result = await extractBatteryInfo(input);
      onDataExtracted(result);
      handleCloseModal(); 
    } catch (error) {
      console.error("Error in OcrExtractionModal extracting info:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setExtractionError(`Error al procesar la solicitud: ${errorMessage}`);
      toast({ title: "Error de Extracción", description: `No se pudo procesar la solicitud. ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(openState) => !openState && handleCloseModal()}>
        <DialogContent className="sm:max-w-[600px] p-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-lg font-semibold">Extraer Datos de Etiqueta (OCR)</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" /><span className="sr-only">Cerrar</span>
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="p-4 space-y-4 flex-grow overflow-y-auto">
            {!imageDataUrl && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-8">
                <Button onClick={() => setIsCameraModalOpen(true)} size="lg">
                  <Camera className="mr-2 h-5 w-5" /> Abrir Cámara
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <Button onClick={handleUploadClick} size="lg" variant="outline">
                  <Upload className="mr-2 h-5 w-5" /> Cargar Imagen
                </Button>
              </div>
            )}

            {imageDataUrl && (
              <div className="space-y-4">
                <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden border">
                  <Image src={imageDataUrl} alt="Previsualización para OCR" layout="fill" objectFit="contain" data-ai-hint="label preview" />
                </div>
                 <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={resetModalState} size="sm">Cambiar Imagen</Button>
                </div>
              </div>
            )}
             {extractionError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                    <span>{extractionError}</span>
                </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t">
            <Button onClick={handleExtract} disabled={!imageDataUrl || isExtracting} className="w-full sm:w-auto">
              {isExtracting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ScanSearch className="mr-2 h-5 w-5" />}
              Extraer Información de Esta Imagen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CameraPreviewModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onImageCaptured={handleImageFromCamera}
      />
    </>
  );
}
