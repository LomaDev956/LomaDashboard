
"use client";

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/camclick/AppHeader';
import { CaptureControls } from '@/components/camclick/CaptureControls';
import { ImageGallery } from '@/components/camclick/ImageGallery';
import { ImageViewModal } from '@/components/camclick/ImageViewModal';
import { CameraPreviewModal } from '@/components/camclick/CameraPreviewModal';
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Camera } from 'lucide-react';

export interface CapturedImage {
  id: string;
  url: string;
  width: number;
  height: number;
  capturedAt: number;
}

export type GalleryViewMode = 'grid-small' | 'grid-medium' | 'grid-large' | 'list' | 'list-details';

export default function CapturePage() {
  const { toast } = useToast();
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<CapturedImage | null>(null);
  const [isCameraPreviewModalOpen, setIsCameraPreviewModalOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<CapturedImage | null>(null);
  const [isViewingNewCapture, setIsViewingNewCapture] = useState(false);
  const [galleryViewMode, setGalleryViewMode] = useState<GalleryViewMode>('grid-medium');
  const [showClearGalleryDialog, setShowClearGalleryDialog] = useState(false);

  const handleImageCaptured = (imageDataUrl: string): Promise<CapturedImage> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const newImage: CapturedImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url: imageDataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          capturedAt: Date.now(),
        };
        setCapturedImages((prevImages) => [newImage, ...prevImages]);
        resolve(newImage);
      };
      img.onerror = () => {
        console.error("Failed to load image for dimension capture. Saving without dimensions.");
        const newImageWithoutDims: CapturedImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url: imageDataUrl,
          width: 0,
          height: 0,
          capturedAt: Date.now(),
        };
        setCapturedImages((prevImages) => [newImageWithoutDims, ...prevImages]);
        resolve(newImageWithoutDims);
      };
      img.src = imageDataUrl;
    });
  };

  const handleImageFileSelected = async (imageDataUrl: string) => {
    const newImage = await handleImageCaptured(imageDataUrl);
    toast({
      title: "Imagen Cargada",
      description: "La imagen se ha cargado y añadido a la galería.",
    });
    setIsViewingNewCapture(true);
    setSelectedImage(newImage);
  };

  const handleOpenImageModal = (image: CapturedImage) => {
    setIsViewingNewCapture(false);
    setSelectedImage(image);
  };

  const handleCloseImageModal = () => {
    setSelectedImage(null);
    setIsViewingNewCapture(false);
  };

  const handleOpenCameraPreviewModal = () => {
    setIsCameraPreviewModalOpen(true);
  };

  const handleCloseCameraPreviewModal = () => {
    setIsCameraPreviewModalOpen(false);
  };

  const handleImageCapturedFromPreview = async (imageDataUrl: string) => {
    const newImage = await handleImageCaptured(imageDataUrl);
    setIsCameraPreviewModalOpen(false);
    setIsViewingNewCapture(true);
    setSelectedImage(newImage);
  };

  const requestDeleteImage = (image: CapturedImage) => {
    setImageToDelete(image);
  };

  const confirmDeleteImage = () => {
    if (imageToDelete) {
      setCapturedImages((prevImages) =>
        prevImages.filter((img) => img.id !== imageToDelete.id)
      );
      toast({
        title: "Imagen Eliminada",
        description: `La imagen ${imageToDelete.id} ha sido eliminada.`,
      });
      if (selectedImage?.id === imageToDelete.id) {
        handleCloseImageModal();
      }
      setImageToDelete(null);
    }
  };

  const sanitizeFilename = (name: string): string => {
    if (!name) return '';
    let sanitized = name.trim();
    sanitized = sanitized.replace(/[\s/\\?%*:|"<>]/g, '_'); 
    sanitized = sanitized.replace(/[^a-zA-Z0-9_.-]/g, ''); 
    return sanitized.substring(0, 100); 
  };

  const handleDownloadImage = (imageUrl: string, imageId: string, desiredName?: string | null) => {
    const link = document.createElement('a');
    link.href = imageUrl;

    let filename = `lomatoolscapture_${imageId}.png`;

    if (desiredName && desiredName.trim() !== "" && desiredName !== "No encontrado." && !desiredName.startsWith("Error:")) {
      const sanitizedBaseName = sanitizeFilename(desiredName);
      if (sanitizedBaseName.length > 0) {
        filename = `${sanitizedBaseName}.png`;
      }
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Descarga Iniciada",
      description: `La imagen ${filename} se está descargando.`,
    });
  };

  const handleRequestClearGallery = () => {
    if (capturedImages.length > 0) {
      setShowClearGalleryDialog(true);
    }
  };

  const handleConfirmClearGallery = () => {
    setCapturedImages([]);
    toast({ title: "Galería Vaciada", description: "Todas las imágenes han sido eliminadas de la galería." });
    setShowClearGalleryDialog(false);
  };


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader 
        title="LomaToolsCapture"
        icon={<Camera className="h-8 w-8 text-primary" />}
        homePath="/capture" // Updated home path
      />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <CaptureControls 
          onOpenCameraPreview={handleOpenCameraPreviewModal} 
          onImageFileSelected={handleImageFileSelected} 
        />
        <p className="hidden text-sm text-muted-foreground text-center -mt-4 mb-8 sm:block">
          Abre la cámara o carga una imagen para capturar y extraer información.
        </p>
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold font-headline">Imágenes Capturadas</h2>
            <div className="flex items-center gap-2">
              <Select value={galleryViewMode} onValueChange={(value) => setGalleryViewMode(value as GalleryViewMode)}>
                <SelectTrigger className="w-auto sm:w-[180px] text-sm h-9">
                  <SelectValue placeholder="Modo de Vista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid-small">Iconos Pequeños</SelectItem>
                  <SelectItem value="grid-medium">Iconos Medianos</SelectItem>
                  <SelectItem value="grid-large">Iconos Grandes</SelectItem>
                  <SelectItem value="list">Lista</SelectItem>
                  <SelectItem value="list-details">Detalles</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleRequestClearGallery} disabled={capturedImages.length === 0} className="h-9">
                <Trash2 className="mr-0 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Vaciar Galería</span>
              </Button>
            </div>
          </div>
          <ImageGallery
            images={capturedImages}
            onImageClick={handleOpenImageModal}
            onImageDelete={requestDeleteImage}
            onImageDownload={handleDownloadImage}
            viewMode={galleryViewMode}
          />
        </div>
      </main>
      <ImageViewModal
        isOpen={!!selectedImage}
        image={selectedImage}
        onClose={handleCloseImageModal}
        onDownloadImage={handleDownloadImage}
        onDeleteImage={requestDeleteImage}
        isNewCapture={isViewingNewCapture}
      />
      <CameraPreviewModal
        isOpen={isCameraPreviewModalOpen}
        onClose={handleCloseCameraPreviewModal}
        onImageCaptured={handleImageCapturedFromPreview}
      />
      {imageToDelete && (
        <AlertDialog open={!!imageToDelete} onOpenChange={(open) => !open && setImageToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar Eliminación?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar la imagen "{imageToDelete.id}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setImageToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteImage}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <AlertDialog open={showClearGalleryDialog} onOpenChange={setShowClearGalleryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Vaciar Galería?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará todas las imágenes de la vista de galería. No afectará a las imágenes ya descargadas en tu dispositivo. ¿Estás seguro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowClearGalleryDialog(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClearGallery}>Vaciar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    