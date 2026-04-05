
"use client";

import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Smartphone, Copy, Loader2, AlertTriangle, Info } from 'lucide-react';

interface ShowQrCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Componente interno para manejar la lógica del lado del cliente de forma segura
const QRCodeInner = () => {
    const { toast } = useToast();
    const [currentUrl, setCurrentUrl] = useState<string>('');

    useEffect(() => {
        // Esto se ejecuta una vez cuando el componente se monta
        const url = window.location.origin;
        setCurrentUrl(url);
    }, []); // El array de dependencias vacío significa que se ejecuta al montar

    const handleCopyUrl = () => {
        if (!currentUrl) return;
        navigator.clipboard.writeText(currentUrl).then(() => {
            toast({ title: "URL Copiada", description: "La dirección se ha copiado al portapapeles." });
        }).catch(err => {
            toast({ title: "Error", description: "No se pudo copiar la URL.", variant: "destructive" });
            console.error('Failed to copy URL: ', err);
        });
    };
    
    const isNgrok = currentUrl.includes('ngrok-free.app') || currentUrl.includes('ngrok.io');
    const isLocalhost = currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1');

    if (!currentUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-[280px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-muted-foreground">Generando código QR...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-4">
             { isLocalhost && (
                <Alert variant="destructive" className="w-full">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>¡Atención! Estás en localhost</AlertTitle>
                    <AlertDescription>
                        Este QR apunta a 'localhost', que tu móvil no podrá resolver. Para conectar tu móvil, inicia la aplicación en tu red local (ej: `http://192.168.1.100:3000`) o usa un servicio como `ngrok`. Recuerda añadir la URL que uses a la lista de orígenes autorizados en la Consola de Google.
                    </AlertDescription>
                </Alert>
            )}
            { isNgrok && (
                <Alert variant="default" className="w-full bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700/50 dark:text-blue-300">
                    <Info className="h-4 w-4 !text-blue-600 dark:!text-blue-400" />
                    <AlertTitle>Estás usando una URL de ngrok</AlertTitle>
                    <AlertDescription className="text-blue-700 dark:text-blue-300/80">
                        ¡Perfecto! Pero recuerda que esta URL es temporal. Si reinicias `ngrok`, la dirección cambiará.
                        <br/>
                        <strong>Acción Requerida:</strong> Para que el inicio de sesión con Google funcione, debes agregar <strong>exactamente esta URL</strong> a tus "Orígenes de JavaScript autorizados" en la Consola de Google Cloud.
                    </AlertDescription>
                </Alert>
            )}
            <div className="p-4 bg-white rounded-lg border">
                <QRCodeCanvas
                    value={currentUrl}
                    size={200}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"L"}
                    includeMargin={false}
                />
            </div>
            <div className="w-full space-y-2">
                <Label htmlFor="current-url">URL de la aplicación para escanear o copiar:</Label>
                <div className="flex items-center gap-2">
                    <Input id="current-url" value={currentUrl} readOnly />
                    <Button type="button" size="icon" onClick={handleCopyUrl}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};


export function ShowQrCodeModal({ isOpen, onClose }: ShowQrCodeModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        Conectar Dispositivo Móvil
                    </DialogTitle>
                    <DialogDescription>
                        Escanea este código QR con tu móvil para usar la app. Asegúrate de que la URL sea accesible desde tu móvil.
                    </DialogDescription>
                </DialogHeader>
                
                {/* Renderiza condicionalmente el componente interno para asegurar que se monte al abrir */}
                {isOpen && <QRCodeInner />}

                <DialogFooter className="sm:justify-start">
                     <DialogClose asChild>
                        <Button type="button" variant="secondary">
                        Cerrar
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
