
"use client";

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CapturedImage, GalleryViewMode } from '@/app/page';
import { format } from 'date-fns';

interface ImageGalleryProps {
  images: CapturedImage[];
  onImageClick: (image: CapturedImage) => void;
  onImageDelete: (image: CapturedImage) => void;
  onImageDownload: (imageUrl: string, imageId: string, desiredName?: string | null) => void;
  viewMode: GalleryViewMode;
}

export function ImageGallery({ images, onImageClick, onImageDelete, onImageDownload, viewMode }: ImageGalleryProps) {
  if (images.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Aún no se han capturado imágenes. Usa el botón de arriba para capturar una imagen.</p>
      </div>
    );
  }

  const renderGridItem = (image: CapturedImage, itemClasses: string, imageSizeClass: string) => (
    <Card
      key={image.id}
      className={cn("overflow-hidden group relative shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out", itemClasses)}
    >
      <CardContent
        className={cn("p-0 aspect-square relative cursor-pointer", imageSizeClass)}
        onClick={() => onImageClick(image)}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onImageClick(image)}
        aria-label={`Ver imagen ${image.id}`}
      >
        <Image
          src={image.url}
          alt={`Imagen capturada ${image.id}`}
          layout="fill"
          objectFit="cover"
          className="transition-transform duration-300 group-hover:scale-105"
          data-ai-hint="webcam capture"
        />
        <div className="absolute top-1 right-1 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-background/70 hover:bg-background/90"
            onClick={(e) => {
              e.stopPropagation();
              onImageDownload(image.url, image.id, null); // Pass null for desiredName from gallery
            }}
            aria-label={`Descargar imagen ${image.id}`}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-7 w-7 bg-destructive/70 hover:bg-destructive/90"
            onClick={(e) => {
              e.stopPropagation();
              onImageDelete(image);
            }}
            aria-label={`Eliminar imagen ${image.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderListItem = (image: CapturedImage) => (
    <div
      key={image.id}
      className="flex items-center p-3 border-b hover:bg-muted/50 cursor-pointer rounded-md transition-colors"
      onClick={() => onImageClick(image)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onImageClick(image)}
      aria-label={`Ver imagen ${image.id}`}
    >
      <Image
        src={image.url}
        alt={`Thumbnail ${image.id}`}
        width={48}
        height={48}
        className="w-12 h-12 object-cover rounded-md mr-3 flex-shrink-0"
        data-ai-hint="thumbnail image"
      />
      <span className="flex-grow font-medium text-sm truncate" title={image.id}>{image.id}</span>
      <div className="flex gap-2 ml-3 flex-shrink-0">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onImageDownload(image.url, image.id, null); // Pass null for desiredName from gallery
          }}
          aria-label={`Descargar imagen ${image.id}`}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onImageDelete(image);
          }}
          aria-label={`Eliminar imagen ${image.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderListDetailsItem = (image: CapturedImage) => (
    <div
      key={image.id}
      className="flex items-center p-3 border-b hover:bg-muted/50 cursor-pointer rounded-md transition-colors"
      onClick={() => onImageClick(image)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onImageClick(image)}
      aria-label={`Ver imagen ${image.id}`}
    >
      <Image
        src={image.url}
        alt={`Thumbnail ${image.id}`}
        width={64}
        height={64}
        className="w-16 h-16 object-cover rounded-md mr-4 flex-shrink-0"
        data-ai-hint="detailed thumbnail"
      />
      <div className="flex-grow space-y-0.5">
        <p className="font-semibold text-sm truncate" title={image.id}>{image.id}</p>
        <p className="text-xs text-muted-foreground">
          Capturada: {image.capturedAt ? format(new Date(image.capturedAt), "dd/MM/yyyy HH:mm:ss") : 'N/A'}
        </p>
        <p className="text-xs text-muted-foreground">
          Dimensiones: {image.width && image.height ? `${image.width}x${image.height}px` : 'N/A'}
        </p>
      </div>
      <div className="flex gap-2 ml-4 flex-shrink-0">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onImageDownload(image.url, image.id, null); // Pass null for desiredName from gallery
          }}
          aria-label={`Descargar imagen ${image.id}`}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onImageDelete(image);
          }}
          aria-label={`Eliminar imagen ${image.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (viewMode === 'list') {
    return <div className="space-y-2">{images.map(renderListItem)}</div>;
  }

  if (viewMode === 'list-details') {
    return <div className="space-y-2">{images.map(renderListDetailsItem)}</div>;
  }

  // Grid views
  let gridClasses = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"; // grid-medium (default)
  let itemClasses = ""; 
  let imageSizeClass = "";

  if (viewMode === 'grid-small') {
    gridClasses = "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2";
  } else if (viewMode === 'grid-large') {
    gridClasses = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";
  } else { // grid-medium
     gridClasses = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4";
  }


  return (
    <div className={cn("grid gap-4", gridClasses)}>
      {images.map(image => renderGridItem(image, itemClasses, imageSizeClass))}
    </div>
  );
}
