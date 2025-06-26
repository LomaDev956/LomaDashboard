
"use client";

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, X, Loader2, Copy, ZoomIn, ZoomOut, Download, Trash2, ScanSearch, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { extractBatteryInfo, type BatteryInfoInput, type BatteryInfoOutput } from '@/ai/flows/extractBatteryInfoFlow';
import { getCustomWarrantyRules, type WarrantyRule } from '@/lib/warranty-rules-storage';
import { 
    type WarrantyInfo, 
    estimateWarrantyFromSerialNumber, 
    getWarrantyStatusBgColor 
} from '@/lib/warranty-utils';


interface CapturedImage {
  id: string;
  url: string;
}

interface ImageViewModalProps {
  isOpen: boolean;
  image: CapturedImage | null;
  onClose: () => void;
  onDownloadImage: (imageUrl: string, imageId: string, desiredName?: string | null) => void;
  onDeleteImage: (image: CapturedImage) => void;
  isNewCapture?: boolean;
}

interface StoredImageData {
  id: string;
  area1Text?: string | null;
  area2Text?: string | null;
  area3Text?: string | null;
  warrantyInfo?: WarrantyInfo | null;
  extractedAt?: number;
}

const LOCAL_STORAGE_KEY = 'lomaToolsCapture_imageDataStore';


const getStoredImageData = (): StoredImageData[] => {
  if (typeof window === 'undefined') return [];
  try {
    const rawData = localStorage.getItem(LOCAL_STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : [];
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return [];
  }
};

const saveStoredImageData = (allData: StoredImageData[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allData));
  } catch (error) {
    console.error("Error writing to localStorage:", error);
  }
};

export function ImageViewModal({ isOpen, image, onClose, onDownloadImage, onDeleteImage, isNewCapture = false }: ImageViewModalProps) {
  const { toast } = useToast();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  const [area1Text, setArea1Text] = useState<string | null>(null);
  const [area2Text, setArea2Text] = useState<string | null>(null);
  const [area3Text, setArea3Text] = useState<string | null>(null);
  const [isExtractingInfo, setIsExtractingInfo] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const [zoomLevel, setZoomLevel] = useState(1.0);
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3.0;
  const ZOOM_STEP = 0.2;

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const zoomWrapperRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [isCheckingWarranty, setIsCheckingWarranty] = useState(false);
  const [warrantyInfo, setWarrantyInfo] = useState<WarrantyInfo | null>(null);
  const [customWarrantyRules, setCustomWarrantyRules] = useState<WarrantyRule[]>([]);

  const updateAndSaveStoredData = useCallback((imageId: string, updates: Partial<Omit<StoredImageData, 'id'>>) => {
    if (typeof window === 'undefined') return;
    const allData = getStoredImageData();
    const existingIndex = allData.findIndex(item => item.id === imageId);
    const updatedItem: StoredImageData = {
      ...(existingIndex > -1 ? allData[existingIndex] : { id: imageId }),
      ...updates,
      extractedAt: Date.now(),
    };

    if (existingIndex > -1) {
      allData[existingIndex] = updatedItem;
    } else {
      allData.push(updatedItem);
    }
    saveStoredImageData(allData);
  }, []);

  const resetAllStates = useCallback(() => {
    setArea1Text(null);
    setArea2Text(null);
    setArea3Text(null);
    setIsExtractingInfo(false);
    setExtractionError(null);
    setWarrantyInfo(null);
    setIsCheckingWarranty(false);
    setZoomLevel(1.0);
    setIsImageLoading(true);
  }, []);

  useEffect(() => {
    const fetchRules = async () => {
        const rules = await getCustomWarrantyRules();
        setCustomWarrantyRules(rules);
    };
    fetchRules();
  }, []);

  useEffect(() => {
    if (isOpen && image) {
      resetAllStates();
      setIsImageLoading(true); 
      
      if (typeof window !== 'undefined') {
        const allData = getStoredImageData();
        const currentImageData = allData.find(item => item.id === image.id);
        if (currentImageData) {
          setArea1Text(currentImageData.area1Text ?? null);
          setArea2Text(currentImageData.area2Text ?? null);
          setArea3Text(currentImageData.area3Text ?? null);
          setWarrantyInfo(currentImageData.warrantyInfo ?? null);
        }
      }
    } else if (!isOpen) {
      resetAllStates();
      imageRef.current = null;
    }
  }, [isOpen, image, resetAllStates]);


  const handleToggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    imageRef.current = event.currentTarget;
    setIsImageLoading(false);
  };

  const handleExtractBatteryInfo = async () => {
    if (!imageRef.current || !image?.url || isImageLoading) {
      toast({ title: "Error", description: "No hay imagen cargada o lista.", variant: "destructive" });
      return;
    }

    setIsExtractingInfo(true);
    setExtractionError(null);
    setWarrantyInfo(null); 


    try {
      const input: BatteryInfoInput = { imageDataUri: image.url };
      const result: BatteryInfoOutput = await extractBatteryInfo(input);

      let foundAny = false;
      let currentErrors: string[] = [];
      const newExtractedData: Partial<StoredImageData> = {};

      if (result.area1Text && !result.area1Text.startsWith("Error:")) {
        setArea1Text(result.area1Text);
        newExtractedData.area1Text = result.area1Text;
        foundAny = true;
      } else if (result.area1Text && result.area1Text.startsWith("Error:")) {
        currentErrors.push(`Serial Number: ${result.area1Text}`);
        setArea1Text(result.area1Text); 
        newExtractedData.area1Text = result.area1Text;
      } else {
        setArea1Text("No encontrado.");
        newExtractedData.area1Text = "No encontrado.";
      }

      if (result.area2Text && !result.area2Text.startsWith("Error:")) {
        setArea2Text(result.area2Text);
        newExtractedData.area2Text = result.area2Text;
        foundAny = true;
      } else if (result.area2Text && result.area2Text.startsWith("Error:")) {
        currentErrors.push(`CAT.NO.: ${result.area2Text}`);
        setArea2Text(result.area2Text);
        newExtractedData.area2Text = result.area2Text;
      } else {
        setArea2Text("No encontrado.");
        newExtractedData.area2Text = "No encontrado.";
      }

      if (result.area3Text && !result.area3Text.startsWith("Error:")) {
        setArea3Text(result.area3Text);
        newExtractedData.area3Text = result.area3Text;
        foundAny = true;
      } else if (result.area3Text && result.area3Text.startsWith("Error:")) {
        currentErrors.push(`Producto: ${result.area3Text}`);
        setArea3Text(result.area3Text);
        newExtractedData.area3Text = result.area3Text;
      } else {
        setArea3Text("No encontrado.");
        newExtractedData.area3Text = "No encontrado.";
      }
      
      if (image?.id) {
        updateAndSaveStoredData(image.id, {
            area1Text: newExtractedData.area1Text,
            area2Text: newExtractedData.area2Text,
            area3Text: newExtractedData.area3Text,
            warrantyInfo: null 
        });
      }


      if (currentErrors.length > 0) {
        setExtractionError(currentErrors.join('\\n'));
        toast({ title: "Error de Extracción", description: "Hubo problemas al extraer alguna información.", variant: "destructive" });
      } else if (foundAny) {
        toast({ title: "Extracción Completa", description: "Información extraída de la etiqueta." });
      } else {
        toast({ title: "Sin Resultados", description: "No se pudo extraer información de las áreas designadas." });
      }

    } catch (error) {
      console.error("Error extracting battery info:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setExtractionError(`Error al procesar la solicitud: ${errorMessage}`);
      toast({ title: "Error de Procesamiento", description: `No se pudo procesar la solicitud. ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsExtractingInfo(false);
    }
  };

  const handleCopyText = async (textToCopy: string | null, fieldName: string) => {
    if (textToCopy && textToCopy !== "No encontrado." && !textToCopy.startsWith("Error:")) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        toast({ title: "Texto Copiado", description: `El texto de ${fieldName} se ha copiado.` });
      } catch (err) {
        console.error(`Failed to copy ${fieldName} text:`, err);
        toast({ title: "Error al Copiar", description: `No se pudo copiar el texto de ${fieldName}.`, variant: "destructive" });
      }
    } else {
      toast({ title: "Nada que Copiar", description: `No hay texto válido para copiar de ${fieldName}.`, variant: "warning" });
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));

  const handleCheckWarranty = async () => {
    if (!image?.id || !area1Text || area1Text === "No encontrado." || area1Text.startsWith("Error:")) {
      toast({ title: "Número de Serie Requerido", description: "No hay un número de serie válido para verificar.", variant: "warning" });
      return;
    }
    setIsCheckingWarranty(true);
    setWarrantyInfo(null); 
    
    await new Promise(resolve => setTimeout(resolve, 50)); 
    
    const estimatedResult = estimateWarrantyFromSerialNumber(area1Text, area3Text, area2Text, customWarrantyRules);
    setWarrantyInfo(estimatedResult);

    if (image?.id) {
        updateAndSaveStoredData(image.id, { warrantyInfo: estimatedResult });
    }

    if (estimatedResult.status !== 'No Estimable' && estimatedResult.status !== 'Error') {
      toast({ title: "Estimación de Garantía", description: estimatedResult.message });
    } else {
      toast({ title: "Estimación de Garantía", description: estimatedResult.message, variant: estimatedResult.status === 'Error' ? "destructive" : "default" });
    }
    setIsCheckingWarranty(false);
  };

  if (!image?.url && isOpen) return null;
  const currentImageUrl = image?.url;
  const currentImageId = image?.id;
  const isValidSerialNumberForWarrantyCheck = area1Text && area1Text !== "No encontrado." && !area1Text.startsWith("Error:");


  return (
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent
        className={cn(
          "flex flex-col overflow-hidden shadow-2xl data-[state=open]:!duration-300",
          isMaximized
            ? "w-screen h-screen max-w-full max-h-full rounded-none border-none p-0"
            : "w-[95vw] h-[90vh] max-w-[95vw] p-0 sm:rounded-lg md:w-[80vw] md:h-[85vh] lg:w-[70vw]"
        )}
        onInteractOutside={(e) => isMaximized && e.preventDefault()}
      >
        <DialogHeader className={cn("p-3 sm:p-4 border-b flex-shrink-0 flex flex-row items-center justify-between", isMaximized && "bg-background text-foreground")}>
          <DialogTitle className="font-headline text-lg truncate">
            {currentImageId ? `Vista Previa: ${currentImageId}` : "Vista Previa de Imagen"}
          </DialogTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoomLevel <= MIN_ZOOM} className="text-muted-foreground hover:text-foreground">
              <ZoomOut className="h-5 w-5" /><span className="sr-only">Alejar</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoomLevel >= MAX_ZOOM} className="text-muted-foreground hover:text-foreground">
              <ZoomIn className="h-5 w-5" /><span className="sr-only">Acercar</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleToggleMaximize} className="text-muted-foreground hover:text-foreground">
              {isMaximized ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              <span className="sr-only">{isMaximized ? 'Restaurar' : 'Maximizar'}</span>
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" /><span className="sr-only">Cerrar</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className={cn("relative flex-grow w-full h-full flex items-center justify-center bg-black/80 overflow-hidden", !isMaximized && "rounded-b-lg")} ref={imageContainerRef}>
          {isImageLoading && isOpen && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-30">
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary" />
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-primary-foreground">Cargando imagen...</p>
            </div>
          )}
          {currentImageUrl && (
            <div ref={zoomWrapperRef} style={{ width: '100%', height: '100%', transform: `scale(${zoomLevel})`, transformOrigin: 'center center', transition: 'transform 0.15s ease-out', position: 'relative' }}>
              <Image key={currentImageUrl} src={currentImageUrl} alt={currentImageId ? `Imagen capturada ${currentImageId}` : "Imagen capturada a tamaño completo"} layout="fill" objectFit="contain" onLoad={handleImageLoad} data-ai-hint="battery label product" priority className={cn(isImageLoading && "opacity-0")} />
            </div>
          )}
        </div>

        <DialogFooter className={cn("p-3 sm:p-4 border-t flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2", isMaximized && "bg-background text-foreground rounded-none", !isMaximized && "rounded-b-lg")}>
          <div className="flex items-center gap-2 flex-wrap">
             <span className="text-xs text-muted-foreground">Zoom: {Math.round(zoomLevel * 100)}%</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isNewCapture && image && (
              <>
                <Button variant="outline" size="sm" onClick={() => currentImageUrl && currentImageId && onDownloadImage(currentImageUrl, currentImageId, area1Text)}>
                  <Download className="mr-2 h-4 w-4" /> Descargar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => image && onDeleteImage(image)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </Button>
              </>
            )}
            <Button onClick={handleExtractBatteryInfo} disabled={isExtractingInfo || isImageLoading || !image} size="sm">
              {isExtractingInfo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
              Extraer Info Etiqueta
            </Button>
          </div>
        </DialogFooter>

        <div className={cn("p-3 sm:p-4 border-t flex-shrink-0 flex flex-col gap-3 max-h-[35vh] sm:max-h-[30vh] overflow-y-auto", isMaximized && "bg-background text-foreground", !isMaximized && "bg-card")}>
            {isExtractingInfo && (
              <div className="flex items-center justify-center p-2">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Extrayendo información...</span>
              </div>
            )}
            {extractionError && !isExtractingInfo && (
              <p className="text-sm text-destructive text-center p-2 whitespace-pre-wrap">{extractionError}</p>
            )}
            {!isExtractingInfo && (area1Text !== null || area2Text !== null || area3Text !== null) && (
              <>
                {area1Text !== null && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="area1-text" className="text-xs text-muted-foreground">Serial Number (Area 1):</Label>
                    <div className="flex items-center gap-2">
                      <Textarea id="area1-text" value={area1Text} readOnly rows={1} className="text-sm bg-muted/50 border-border min-h-[40px] h-auto max-w-md" placeholder="Serial Number aparecerá aquí" />
                      <Button variant="outline" size="icon" onClick={() => handleCopyText(area1Text, "Serial Number")} className="h-9 w-9 flex-shrink-0" aria-label="Copiar Serial Number" disabled={!area1Text || area1Text === "No encontrado." || area1Text.startsWith("Error:")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {area2Text !== null && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="area2-text" className="text-xs text-muted-foreground">CAT.NO. (Area 2):</Label>
                    <div className="flex items-center gap-2">
                      <Textarea id="area2-text" value={area2Text} readOnly rows={1} className="text-sm bg-muted/50 border-border min-h-[40px] h-auto max-w-md" placeholder="CAT.NO. aparecerá aquí" />
                       <Button variant="outline" size="icon" onClick={() => handleCopyText(area2Text, "CAT.NO.")} className="h-9 w-9 flex-shrink-0" aria-label="Copiar CAT.NO." disabled={!area2Text || area2Text === "No encontrado." || area2Text.startsWith("Error:")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {area3Text !== null && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="area3-text" className="text-xs text-muted-foreground">Producto (Area 3):</Label>
                    <div className="flex items-center gap-2">
                      <Textarea id="area3-text" value={area3Text} readOnly rows={2} className="text-sm bg-muted/50 border-border min-h-[60px] h-auto max-w-md" placeholder="Producto aparecerá aquí" />
                       <Button variant="outline" size="icon" onClick={() => handleCopyText(area3Text, "Producto")} className="h-9 w-9 flex-shrink-0 self-start mt-1" aria-label="Copiar Producto" disabled={!area3Text || area3Text === "No encontrado." || area3Text.startsWith("Error:")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {(area1Text !== null || (isNewCapture && !isExtractingInfo)) && !isExtractingInfo && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2 sm:gap-4">
                    <h4 className="text-sm font-medium">Estimación de Garantía</h4>
                    <Button onClick={handleCheckWarranty} disabled={isCheckingWarranty || !isValidSerialNumberForWarrantyCheck} size="sm" variant="outline" className="whitespace-nowrap w-full sm:w-auto">
                        {isCheckingWarranty ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                        Estimar Garantía por S/N
                    </Button>
                </div>
                {isCheckingWarranty && (
                  <div className="flex items-center text-sm text-muted-foreground p-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Estimando garantía desde número de serie...
                  </div>
                )}
                {warrantyInfo && !isCheckingWarranty && (
                  <div className={cn(
                    "p-2.5 rounded-md text-sm space-y-1",
                    getWarrantyStatusBgColor(warrantyInfo.status)
                  )}>
                    <p className="font-semibold flex items-center">
                        {warrantyInfo.status === 'No Estimable' || warrantyInfo.status === 'Error' ? <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" /> : null}
                        Estado: {warrantyInfo.status}
                    </p>
                    <p>{warrantyInfo.message}</p>
                    {warrantyInfo.estimationDetails && (
                        <p className="text-xs opacity-80 pt-1 mt-1 border-t border-current/30">
                            Detalle de estimación: {warrantyInfo.estimationDetails}
                        </p>
                    )}
                  </div>
                )}
                 <p className="text-xs text-muted-foreground mt-2 text-center">
                    La estimación se basa en un intento de parsear la fecha de fabricación desde el S/N y los años de garantía según la política general de Milwaukee y reglas personalizadas.
                    No es una verificación oficial. Para información precisa, consulta eService de Milwaukee.
                 </p>
                 {(!area1Text || area1Text === "No encontrado." || area1Text.startsWith("Error:") || area1Text === null) && !isExtractingInfo && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 text-center">
                        Se requiere un Número de Serie válido (Area 1) para intentar la estimación. Extrae la información de la etiqueta primero.
                    </p>
                 )}
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
