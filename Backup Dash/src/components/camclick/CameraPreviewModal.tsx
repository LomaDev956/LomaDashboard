
"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2, AlertTriangle, Focus, Sun, Contrast, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CameraPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCaptured: (imageDataUrl: string) => void;
}

export function CameraPreviewModal({ isOpen, onClose, onImageCaptured }: CameraPreviewModalProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    setVideoNode(node);
  }, []);

  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(true);

  // Focus state
  const [currentFocusMode, setCurrentFocusMode] = useState<'auto' | 'manual'>('auto');
  const [currentFocusDistance, setCurrentFocusDistance] = useState(0.5);
  const [cameraFocusCapabilities, setCameraFocusCapabilities] = useState<MediaTrackCapabilities | null>(null);
  const [manualFocusSupported, setManualFocusSupported] = useState(false);

  // Brightness state
  const [currentBrightness, setCurrentBrightness] = useState(128); // Default typical midpoint
  const [brightnessCapabilities, setBrightnessCapabilities] = useState<MediaTrackCapabilities['brightness']>(null);
  const [brightnessSupported, setBrightnessSupported] = useState(false);

  // Contrast state
  const [currentContrast, setCurrentContrast] = useState(1); // Default typical midpoint
  const [contrastCapabilities, setContrastCapabilities] = useState<MediaTrackCapabilities['contrast']>(null);
  const [contrastSupported, setContrastSupported] = useState(false);

  // Sharpness state
  const [currentSharpness, setCurrentSharpness] = useState(128); // Default typical midpoint
  const [sharpnessCapabilities, setSharpnessCapabilities] = useState<MediaTrackCapabilities['sharpness']>(null);
  const [sharpnessSupported, setSharpnessSupported] = useState(false);


  useEffect(() => {
    let activeStreamInstance: MediaStream | null = null;

    const resetCameraStates = () => {
      setIsCameraLoading(true);
      setVideoError(null);
      
      // Focus
      setCameraFocusCapabilities(null);
      setManualFocusSupported(false);
      setCurrentFocusMode('auto');
      // setCurrentFocusDistance(0.5); // Or keep last user setting if preferred

      // Image Adjustments
      setBrightnessSupported(false);
      setBrightnessCapabilities(null);
      // setCurrentBrightness(128); 
      setContrastSupported(false);
      setContrastCapabilities(null);
      // setCurrentContrast(1);
      setSharpnessSupported(false);
      setSharpnessCapabilities(null);
      // setCurrentSharpness(128);
    };

    if (!isOpen || !videoNode) {
      resetCameraStates();
      if (currentStream) { 
        currentStream.getTracks().forEach(track => track.stop());
        setCurrentStream(null);
      }
      if (videoNode && videoNode.srcObject) {
         videoNode.srcObject = null;
      }
      return;
    }

    const startCameraAsync = async () => {
      resetCameraStates(); 

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const unsupportedMessage = "Tu navegador no soporta acceso a la cámara.";
        setVideoError(unsupportedMessage);
        setIsCameraLoading(false);
        toast({ title: "Navegador no Soportado", description: unsupportedMessage, variant: "destructive" });
        return;
      }

      const resolutions = [
        { width: { ideal: 3840 }, height: { ideal: 2160 }, label: "4K UHD (3840x2160)" }, 
        { width: { ideal: 1920 }, height: { ideal: 1080 }, label: "Full HD (1920x1080)" },
        { width: { ideal: 1280 }, height: { ideal: 1024 }, label: "Target (1280x1024)" },
        { width: { ideal: 1280 }, height: { ideal: 720 }, label: "HD (1280x720)" },
      ];

      let newStream: MediaStream | null = null;

      for (const res of resolutions) {
        try {
          const constraints = { video: { ...res, facingMode: "environment" } };
          newStream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log(`Successfully obtained stream with ${res.label}`);
          break; 
        } catch (e) {
          console.warn(`Could not get environment camera with ${res.label}`, e);
        }
      }

      if (!newStream) {
        try {
          console.warn("Could not get any preferred high resolution, trying default video constraints for environment camera.");
          newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        } catch (e) {
           console.warn("Could not get environment camera, trying any video device.");
           try {
            newStream = await navigator.mediaDevices.getUserMedia({ video: true });
           } catch (errFinal) {
              console.error("Error al acceder a la cámara (final attempt):", errFinal);
              let message = "No se pudo acceder a la cámara. Revisa los permisos.";
              if (errFinal instanceof Error) {
                if (errFinal.name === "NotAllowedError") message = "Acceso a la cámara denegado. Habilita los permisos.";
                else if (errFinal.name === "NotFoundError") message = "No se encontró cámara. Verifica que esté conectada.";
                else if (errFinal.name === "NotReadableError") message = "La cámara ya está en uso o hay un problema con el hardware.";
                else message = `Error de cámara: ${errFinal.message}`;
              }
              setVideoError(message);
              setIsCameraLoading(false);
              toast({ title: "Error de Cámara", description: message, variant: "destructive" });
              setCurrentStream(null);
              return;
           }
        }
      }
        
      activeStreamInstance = newStream;
      setCurrentStream(newStream);

      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        const settings = videoTrack.getSettings();
        console.log("Actual video track settings:", settings);
        console.log("Actual video track capabilities:", capabilities);


        // Focus Capabilities
        setCameraFocusCapabilities(capabilities);
        const supportedFocusModes = capabilities.focusMode || [];
        const isManualSupported = supportedFocusModes.includes('manual');
        const isContinuousSupported = supportedFocusModes.includes('continuous');
        setManualFocusSupported(isManualSupported);

        if (isContinuousSupported) { 
          videoTrack.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
            .then(() => setCurrentFocusMode('auto'))
            .catch(e => console.warn("Error applying initial auto focus", e));
        } else if (isManualSupported && capabilities.focusDistance) {
          const { min, max } = capabilities.focusDistance;
          const midDistance = settings.focusDistance ?? ((min ?? 0) + (max ?? 1)) /2;
          setCurrentFocusDistance(midDistance);
          videoTrack.applyConstraints({ advanced: [{ focusMode: 'manual', focusDistance: midDistance }] })
            .then(() => setCurrentFocusMode('manual'))
            .catch(e => console.warn("Error applying initial manual focus", e));
        }
        
        // Brightness Capabilities
        if (capabilities.brightness) {
          setBrightnessSupported(true);
          setBrightnessCapabilities(capabilities.brightness);
          setCurrentBrightness(settings.brightness ?? (capabilities.brightness.min + (capabilities.brightness.max - capabilities.brightness.min) / 2));
        }
        // Contrast Capabilities
        if (capabilities.contrast) {
          setContrastSupported(true);
          setContrastCapabilities(capabilities.contrast);
          setCurrentContrast(settings.contrast ?? (capabilities.contrast.min + (capabilities.contrast.max - capabilities.contrast.min) / 2));
        }
        // Sharpness Capabilities
        if (capabilities.sharpness) {
          setSharpnessSupported(true);
          setSharpnessCapabilities(capabilities.sharpness);
          setCurrentSharpness(settings.sharpness ?? (capabilities.sharpness.min + (capabilities.sharpness.max - capabilities.sharpness.min) / 2));
        }
      }

      videoNode.srcObject = newStream;
      videoNode.onloadedmetadata = () => {
        videoNode.play().then(() => {
          setIsCameraLoading(false);
          const trackSettings = newStream?.getVideoTracks()[0]?.getSettings();
          const actualWidth = trackSettings?.width;
          const actualHeight = trackSettings?.height;
          let resolutionMessage = "Apunta y captura.";
          if(actualWidth && actualHeight){
            resolutionMessage = `Cámara activa (${actualWidth}x${actualHeight}). Apunta y captura.`;
          }
          toast({ title: "Cámara Activada", description: resolutionMessage });
        }).catch(playError => {
          console.error("Error al reproducir video:", playError);
          const errorMsg = "No se pudo iniciar la reproducción del video. Asegúrate que la cámara no esté en uso.";
          setVideoError(errorMsg);
          setIsCameraLoading(false);
          toast({ title: "Error de Reproducción", description: errorMsg, variant: "destructive" });
          
          if (activeStreamInstance) activeStreamInstance.getTracks().forEach(track => track.stop());
          setCurrentStream(null); 
          activeStreamInstance = null;
        });
      };
      videoNode.onerror = (e) => {
        console.error("Error en elemento de video:", e);
        const errorMsg = "Ocurrió un error con el stream de video.";
        setVideoError(errorMsg);
        setIsCameraLoading(false);
        toast({ title: "Error de Video", description: errorMsg, variant: "destructive" });

        if (activeStreamInstance) activeStreamInstance.getTracks().forEach(track => track.stop());
        setCurrentStream(null); 
        activeStreamInstance = null;
      };
    };

    startCameraAsync();

    return () => {
      if (activeStreamInstance) {
        activeStreamInstance.getTracks().forEach(track => track.stop());
      }
      if (videoNode) {
        videoNode.style.transform = ''; // Clear any transform
      }
    };
  }, [isOpen, videoNode, toast]); 

  const handleCapture = () => {
    if (isCameraLoading || videoError || !videoNode || !canvasRef.current || !currentStream?.active) {
      toast({ title: "Captura Fallida", description: "La cámara no está lista o hay un error.", variant: "destructive" });
      return;
    }

    const video = videoNode;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast({ title: "Captura Fallida", description: "Stream de video no tiene dimensiones.", variant: "destructive" });
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png'); 
      onImageCaptured(dataUrl);
      toast({ title: "¡Imagen Capturada!", description: `Se agregó a tu galería (${canvas.width}x${canvas.height}).` });
    } else {
      toast({ title: "Captura Fallida", description: "No se pudo procesar la imagen.", variant: "destructive" });
    }
  };
  
  const handleFocusModeChange = (checked: boolean) => {
    const newMode = checked ? 'manual' : 'auto';
    const track = currentStream?.getVideoTracks()[0];

    if (track && cameraFocusCapabilities) {
      const supportedModes = cameraFocusCapabilities.focusMode || [];
      if (newMode === 'auto' && supportedModes.includes('continuous')) {
        track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
          .then(() => setCurrentFocusMode('auto'))
          .catch(e => {
            console.warn("Error applying auto focus", e);
            toast({ title: "Error de Enfoque", description: "No se pudo activar el enfoque automático.", variant: "destructive" });
          });
      } else if (newMode === 'manual' && manualFocusSupported && cameraFocusCapabilities.focusDistance) {
        let distanceToApply = currentFocusDistance;
        if (cameraFocusCapabilities.focusDistance.min !== undefined && cameraFocusCapabilities.focusDistance.max !== undefined) {
            if(currentFocusDistance < cameraFocusCapabilities.focusDistance.min || currentFocusDistance > cameraFocusCapabilities.focusDistance.max) {
                 distanceToApply = (cameraFocusCapabilities.focusDistance.min + cameraFocusCapabilities.focusDistance.max) / 2;
                 setCurrentFocusDistance(distanceToApply);
            }
        }
        
        track.applyConstraints({ advanced: [{ focusMode: 'manual', focusDistance: distanceToApply }] })
          .then(() => setCurrentFocusMode('manual'))
          .catch(e => {
            console.warn("Error applying manual focus", e);
            toast({ title: "Error de Enfoque", description: "No se pudo activar el enfoque manual.", variant: "destructive" });
          });
      } else {
        toast({ title: "Enfoque no Soportado", description: `Modo de enfoque ${newMode} no disponible.`, variant: "destructive" });
      }
    }
  };

  const handleFocusDistanceChange = (value: number[]) => {
    const newDistance = value[0];
    setCurrentFocusDistance(newDistance);
    const track = currentStream?.getVideoTracks()[0];
    if (track && currentFocusMode === 'manual' && manualFocusSupported) {
      track.applyConstraints({ advanced: [{ focusDistance: newDistance }] })
        .catch(e => {
          console.warn("Error applying focus distance", e)
        });
    }
  };

  const createSliderHandler = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    constraintName: 'brightness' | 'contrast' | 'sharpness'
  ) => (value: number[]) => {
    const newValue = value[0];
    setter(newValue);
    const track = currentStream?.getVideoTracks()[0];
    if (track && !isCameraLoading && !videoError) {
      track.applyConstraints({ advanced: [{ [constraintName]: newValue }] })
        .catch(e => console.warn(`Error applying ${constraintName}`, e));
    }
  };

  const handleBrightnessChange = createSliderHandler(setCurrentBrightness, 'brightness');
  const handleContrastChange = createSliderHandler(setCurrentContrast, 'contrast');
  const handleSharpnessChange = createSliderHandler(setCurrentSharpness, 'sharpness');


  const handleDialogInteraction = (openState: boolean) => {
    if (!openState) {
      onClose(); 
    }
  };

  const focusDistanceStep = cameraFocusCapabilities?.focusDistance?.step || 0.01;
  const focusDistanceMin = cameraFocusCapabilities?.focusDistance?.min || 0;
  const focusDistanceMax = cameraFocusCapabilities?.focusDistance?.max || 1;

  const getPrecision = (step?: number) => {
    if (step === undefined || step === 0) return 1;
    if (step >= 1) return 0;
    if (step >= 0.1) return 1;
    if (step >= 0.01) return 2;
    return 3;
  }

  const brightnessPrecision = getPrecision(brightnessCapabilities?.step);
  const contrastPrecision = getPrecision(contrastCapabilities?.step);
  const sharpnessPrecision = getPrecision(sharpnessCapabilities?.step);


  return (
    <Dialog open={isOpen} onOpenChange={handleDialogInteraction}>
      <DialogContent className="max-w-2xl md:max-w-4xl lg:max-w-6xl w-[95vw] sm:w-full p-0 flex flex-col h-[80vh] sm:h-[90vh] rounded-lg shadow-2xl">
        <DialogHeader className="p-3 sm:p-4 border-b flex-shrink-0 bg-card rounded-t-lg">
          <DialogTitle className="text-lg font-semibold">Vista Previa de Cámara</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="absolute right-2 sm:right-3 top-2 sm:top-3 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="flex-grow relative bg-black overflow-hidden flex items-center justify-center">
          {isCameraLoading && !videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary" />
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-primary-foreground">Iniciando cámara...</p>
            </div>
          )}
          {videoError && ( 
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/90 z-20 p-4 text-center">
              <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive-foreground mb-3 sm:mb-4" />
              <h3 className="text-md sm:text-lg font-semibold text-destructive-foreground">Error de Cámara</h3>
              <p className="text-xs sm:text-sm text-destructive-foreground/80 mt-1">{videoError}</p>
              <Button onClick={onClose} className="mt-4" variant="secondary" size="sm">
                Cerrar
              </Button>
            </div>
          )}
          <video
            ref={videoCallbackRef}
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover",
              (isCameraLoading || videoError) && "opacity-0" 
            )}
            style={{ transformOrigin: 'center center' }}
            playsInline
            autoPlay
            muted
          />
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter className="p-3 sm:p-4 border-t bg-card rounded-b-lg flex-shrink-0 
                                 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-2">
          <div className="flex flex-col gap-4 w-full sm:w-auto max-h-[150px] sm:max-h-none overflow-y-auto pr-2">
            {/* Focus Controls */}
            {currentStream && !isCameraLoading && !videoError && (cameraFocusCapabilities || !manualFocusSupported) && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Focus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <Switch
                    id="focus-mode-toggle"
                    checked={currentFocusMode === 'manual'}
                    onCheckedChange={handleFocusModeChange}
                    disabled={!manualFocusSupported || !!videoError || isCameraLoading}
                    aria-label="Toggle Focus Mode"
                  />
                  <Label htmlFor="focus-mode-toggle" className="text-sm text-muted-foreground whitespace-nowrap">
                    Enfoque {currentFocusMode === 'manual' ? 'Manual' : 'Auto'}
                  </Label>
                </div>

                {currentFocusMode === 'manual' && manualFocusSupported && cameraFocusCapabilities?.focusDistance && (
                  <div className="flex items-center gap-2 pl-1 pr-1 sm:pl-0 sm:pr-0">
                    <Slider
                      min={focusDistanceMin}
                      max={focusDistanceMax}
                      step={focusDistanceStep}
                      value={[currentFocusDistance]}
                      onValueChange={handleFocusDistanceChange}
                      disabled={!!videoError || isCameraLoading}
                      className="flex-grow"
                      aria-label="Focus Distance"
                    />
                    <span className="text-xs w-12 text-center tabular-nums text-muted-foreground">
                      {currentFocusDistance.toFixed(getPrecision(focusDistanceStep))}
                    </span>
                  </div>
                )}
                 {!manualFocusSupported && isOpen && !isCameraLoading && currentStream && (
                    <p className="text-xs text-muted-foreground text-center sm:text-left pl-0 sm:pl-7">Enfoque manual no soportado.</p>
                )}
              </div>
            )}

            {/* Brightness Control */}
            {brightnessSupported && currentStream && !isCameraLoading && !videoError && brightnessCapabilities && (
              <div className="flex flex-col gap-1">
                <Label htmlFor="brightness-slider" className="text-xs text-muted-foreground pl-1">Brillo</Label>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Slider
                    id="brightness-slider"
                    min={brightnessCapabilities.min}
                    max={brightnessCapabilities.max}
                    step={brightnessCapabilities.step || 1}
                    value={[currentBrightness]}
                    onValueChange={handleBrightnessChange}
                    disabled={isCameraLoading || !!videoError}
                    className="flex-grow"
                    aria-label="Brillo"
                  />
                  <span className="text-xs w-10 text-center tabular-nums text-muted-foreground">
                    {currentBrightness.toFixed(brightnessPrecision)}
                  </span>
                </div>
              </div>
            )}

            {/* Contrast Control */}
            {contrastSupported && currentStream && !isCameraLoading && !videoError && contrastCapabilities && (
              <div className="flex flex-col gap-1">
                <Label htmlFor="contrast-slider" className="text-xs text-muted-foreground pl-1">Contraste</Label>
                <div className="flex items-center gap-2">
                  <Contrast className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Slider
                    id="contrast-slider"
                    min={contrastCapabilities.min}
                    max={contrastCapabilities.max}
                    step={contrastCapabilities.step || 0.1}
                    value={[currentContrast]}
                    onValueChange={handleContrastChange}
                    disabled={isCameraLoading || !!videoError}
                    className="flex-grow"
                    aria-label="Contraste"
                  />
                  <span className="text-xs w-10 text-center tabular-nums text-muted-foreground">
                    {currentContrast.toFixed(contrastPrecision)}
                  </span>
                </div>
              </div>
            )}

            {/* Sharpness Control */}
            {sharpnessSupported && currentStream && !isCameraLoading && !videoError && sharpnessCapabilities && (
              <div className="flex flex-col gap-1">
                <Label htmlFor="sharpness-slider" className="text-xs text-muted-foreground pl-1">Nitidez</Label>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Slider
                    id="sharpness-slider"
                    min={sharpnessCapabilities.min}
                    max={sharpnessCapabilities.max}
                    step={sharpnessCapabilities.step || 1}
                    value={[currentSharpness]}
                    onValueChange={handleSharpnessChange}
                    disabled={isCameraLoading || !!videoError}
                    className="flex-grow"
                    aria-label="Nitidez"
                  />
                  <span className="text-xs w-10 text-center tabular-nums text-muted-foreground">
                    {currentSharpness.toFixed(sharpnessPrecision)}
                  </span>
                </div>
              </div>
            )}
            
            {(!currentStream || isCameraLoading || videoError || (!cameraFocusCapabilities && !brightnessSupported && !contrastSupported && !sharpnessSupported)) && (
                <div className="min-h-[50px] sm:min-h-0"></div> 
            )}
          </div>

          <Button onClick={handleCapture} size="lg" disabled={!!videoError || isCameraLoading || !currentStream?.active} 
                  className="min-w-[120px] sm:min-w-[150px] sm:self-center mt-2 sm:mt-0">
            <Camera className="mr-2 h-5 w-5" />
            Capturar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

