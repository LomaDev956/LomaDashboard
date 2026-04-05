
"use client";

import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Upload, Download, Loader2, AlertTriangle, BookOpenCheck, Settings as SettingsIcon, ExternalLink, Info, LogIn, LogOut, CheckCircle, CloudUpload, CloudDownload, Cloud } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { SimpleTrackingPanel } from '@/components/loma-dashboard/SimpleTrackingPanel';
import { WarrantyLearningStats } from '@/components/loma-dashboard/WarrantyLearningStats';
// import { MilwaukeeCredentialsPanel } from '@/components/loma-dashboard/MilwaukeeCredentialsPanel';


// Data imports
import { getHerramientasList, type Herramienta } from '@/lib/herramientas-storage';
import { getPersonalList, type Personal } from '@/lib/personal-storage';
import { getListasGarantia, type ListaGarantia } from '@/lib/garantias-storage';
import { getCustomWarrantyRules, type WarrantyRule } from '@/lib/warranty-rules-storage';
import { getAllCatNoKnowledge, type CatNoKnowledge } from '@/lib/cat-no-knowledge-storage';
import { openDB, HERRAMIENTAS_STORE_NAME, PERSONAL_STORE_NAME, GARANTIAS_STORE_NAME, RULES_STORE_NAME, KNOWLEDGE_STORE_NAME, DB_NAME, DB_VERSION } from '@/db';

// Extend window interface for gapi and google
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const APP_NAME_FOR_BACKUP = 'LomaToolsApp';
const DRIVE_BACKUP_FILENAME = 'loma-tools-backup.json';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} MB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** POST con progreso real de subida (bytes enviados). Usa XHR para tener upload.onprogress. */
function postWithUploadProgress(
  url: string,
  body: string,
  onProgress: (loaded: number, total: number) => void
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };

    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: () => Promise.resolve(JSON.parse(xhr.responseText || '{}')),
      });
    };
    xhr.onerror = () => reject(new Error('Error de red'));
    xhr.ontimeout = () => reject(new Error('Tiempo agotado'));
    xhr.send(body);
  });
}

interface BackupData {
  appName: string;
  dbVersion: number;
  backupDate: string;
  herramientas: Herramienta[];
  personal: Personal[];
  listasGarantia: ListaGarantia[];
  customWarrantyRules: WarrantyRule[];
  catNoKnowledge: CatNoKnowledge[];
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [restoreData, setRestoreData] = useState<BackupData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [showRestoreConfirmDialog, setShowRestoreConfirmDialog] = useState(false);
  // Opciones de qué importar (por defecto todo excepto fotos para que sea rápido)
  const [includeHerramientas, setIncludeHerramientas] = useState(true);
  const [includePersonal, setIncludePersonal] = useState(true);
  const [includeGarantias, setIncludeGarantias] = useState(true);
  const [includeFotos, setIncludeFotos] = useState(false);

  // Barra de progreso (restauración / actualizar solo fotos)
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  const setProgress = (percent: number, label: string) => {
    setProgressPercent(percent);
    setProgressLabel(label);
  };

  // Google Drive State
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [isBrave, setIsBrave] = useState(false);
  const [popupBlockedError, setPopupBlockedError] = useState(false);
  const [origin, setOrigin] = useState<string>('');
  /** undefined = aún cargando desde /api; null = no configurado; string = listo */
  const [oauthClientId, setOauthClientId] = useState<string | null | undefined>(undefined);

  const SCOPES = 'https://www.googleapis.com/auth/drive.file';
  
  useEffect(() => {
    setOrigin(window.location.origin);
    const checkBrave = async () => {
      try {
        if ((navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function') {
          const result = await (navigator as any).brave.isBrave();
          setIsBrave(result);
        }
      } catch (e) {
        console.warn("Could not check for Brave browser.", e);
      }
    };
    checkBrave();
  }, []);

  const initGoogleAuth = useCallback(() => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      setDriveError("La librería de Google no se cargó. Intenta recargar la página.");
      return;
    }
    if (!oauthClientId) {
      setDriveError(
        "No hay Client ID de OAuth. En el servidor define GOOGLE_OAUTH_WEB_CLIENT_ID o NEXT_PUBLIC_GOOGLE_CLIENT_ID en .env (y reinicia PM2). Si usas solo NEXT_PUBLIC_*, ejecuta también npm run build."
      );
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: oauthClientId,
        scope: SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            setAccessToken(tokenResponse.access_token);
            sessionStorage.setItem('google_access_token', tokenResponse.access_token);
            setDriveError(null);
            setPopupBlockedError(false);
          } else {
            setDriveError('Error: No se recibió un token de acceso válido de Google.');
          }
        },
        error_callback: (error: any) => {
          setAccessToken(null);
          sessionStorage.removeItem('google_access_token');
          let userMessage = 'Ocurrió un error de autenticación. Revisa la consola.';
          
          if (error?.type === 'popup_failed_to_open' || error?.message?.includes('popup')) {
            userMessage = "¡POPUP BLOQUEADO! El navegador bloqueó la ventana de Google.";
            setPopupBlockedError(true);
          } else if (error?.type === 'popup_closed') {
            userMessage = "Se cerró la ventana de inicio de sesión antes de completar. Inténtalo de nuevo.";
            setPopupBlockedError(false);
          } else if (error?.type === 'unauthorized_client' || error?.message?.includes('origin')) {
            userMessage = `Error de origen. Asegúrate de que '${window.location.origin}' esté añadido como 'Origen de JavaScript autorizado' y 'URI de redireccionamiento autorizado' en tu Consola de Google Cloud.`;
            setPopupBlockedError(false);
          } else if (error?.message) {
            userMessage = `Error de Google: ${error.message}`;
            setPopupBlockedError(false);
          }
          setDriveError(userMessage);
        }
      });
      setTokenClient(client);
      setIsGisLoaded(true);
    } catch (e: any) {
      setDriveError(`Error inicializando autenticación de Google: ${e.message}`);
    }
  }, [oauthClientId, SCOPES]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/config/google-oauth-client', { credentials: 'include' });
        const data = (await res.json()) as { clientId?: string | null };
        if (!cancelled) setOauthClientId(data.clientId?.trim() || null);
      } catch {
        if (!cancelled) setOauthClientId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Check for a stored token on every mount
    const storedToken = sessionStorage.getItem('google_access_token');
    if (storedToken) {
      setAccessToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (oauthClientId === undefined) return;

    if (!oauthClientId) {
      setDriveError(
        "No hay Client ID de Google OAuth en el servidor. Añade GOOGLE_OAUTH_WEB_CLIENT_ID=tu-id.apps.googleusercontent.com en ~/loma-app/.env y ejecuta: pm2 restart loma-app --update-env (sin rebuild). O usa NEXT_PUBLIC_GOOGLE_CLIENT_ID y luego npm run build."
      );
      setIsGisLoaded(false);
      setTokenClient(null);
      return;
    }

    setDriveError(null);
    const gisScriptId = 'gis-script';
    if (document.getElementById(gisScriptId)) {
      if (window.google) initGoogleAuth();
      return;
    }

    const gisScript = document.createElement('script');
    gisScript.id = gisScriptId;
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => initGoogleAuth();
    gisScript.onerror = () => setDriveError("Fallo al cargar el script de Google. Revisa tu conexión.");
    document.body.appendChild(gisScript);
  }, [oauthClientId, initGoogleAuth]);

  const handleSignIn = useCallback(() => {
    setDriveError(null);
    setPopupBlockedError(false);

    if (!isGisLoaded || !tokenClient) {
      setDriveError("El cliente de Google no está listo. Inténtalo de nuevo en un momento o recarga la página.");
      return;
    }
    
    try {
      if(window.google && window.google.accounts && window.google.accounts.oauth2 && tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'select_account consent' });
      } else {
        setDriveError("El cliente de Google no está disponible. No se puede solicitar el token.");
      }
    } catch (e: any) {
      setDriveError(`Error al intentar abrir la ventana de Google: ${e.message}.`);
    }
  }, [tokenClient, isGisLoaded]);

  const handleSignOut = () => {
    if (accessToken && window.google) {
      window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
    setAccessToken(null);
    sessionStorage.removeItem('google_access_token');
    setDriveError(null);
    setPopupBlockedError(false);
    toast({ title: "Sesión Cerrada", description: "Te has desconectado de Google Drive." });
  };

  const gatherBackupData = async (): Promise<BackupData> => {
     const [herramientas, personal, listasGarantia, customWarrantyRules, catNoKnowledge] = await Promise.all([
        getHerramientasList(),
        getPersonalList(),
        getListasGarantia(),
        getCustomWarrantyRules(),
        getAllCatNoKnowledge()
      ]);
      return { appName: APP_NAME_FOR_BACKUP, dbVersion: DB_VERSION, backupDate: new Date().toISOString(), herramientas, personal, listasGarantia, customWarrantyRules, catNoKnowledge };
  }

  const handleExport = async () => {
    setIsLoading(true);
    toast({ title: "Iniciando respaldo...", description: "Recolectando datos." });
    try {
      const backupData = await gatherBackupData();
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `loma-tools-backup-${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Respaldo Creado", description: `Se ha descargado el archivo ${link.download}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error en el Respaldo", description: "No se pudieron exportar los datos." });
    } finally {
      setIsLoading(false);
    }
  };
  
  /** Normaliza distintos formatos de backup a BackupData */
  const normalizeBackup = (data: any): BackupData => {
    const listasGarantia = data.listasGarantia ?? data.garantias ?? [];
    return {
      appName: data.appName ?? APP_NAME_FOR_BACKUP,
      dbVersion: data.dbVersion ?? DB_VERSION,
      backupDate: data.backupDate ?? data.timestamp ?? new Date().toISOString(),
      herramientas: Array.isArray(data.herramientas) ? data.herramientas : [],
      personal: Array.isArray(data.personal) ? data.personal : [],
      listasGarantia,
      customWarrantyRules: data.customWarrantyRules ?? [],
      catNoKnowledge: data.catNoKnowledge ?? [],
    };
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setFileName(file.name);
    try {
      const data = JSON.parse(await file.text());
      const hasRequired = Array.isArray(data.herramientas) && Array.isArray(data.personal);
      const hasGarantias = Array.isArray(data.listasGarantia) || Array.isArray(data.garantias);
      if (!hasRequired) throw new Error("El archivo no tiene el formato esperado (herramientas, personal).");
      setRestoreData(normalizeBackup(data));
    } catch (error) {
      toast({ variant: "destructive", title: "Archivo Inválido", description: error instanceof Error ? error.message : "Error desconocido." });
      setRestoreData(null);
      setFileName('');
    } finally {
      setIsLoading(false);
      if (event.target) event.target.value = '';
    }
  };
  
  /** Payload para la API según qué quiera importar el usuario. */
  const toServerPayload = (data: BackupData) => {
    const herramientasRaw = includeHerramientas ? (data.herramientas ?? []) : [];
    const herramientas = herramientasRaw.map((h: any) =>
      includeFotos ? h : { ...h, fotos: [] }
    );
    return {
      version: data.dbVersion?.toString() ?? '1.0',
      timestamp: data.backupDate,
      herramientas,
      garantias: includeGarantias ? (data.listasGarantia ?? []) : [],
      personal: includePersonal
        ? (data.personal ?? []).map((p: any) => ({
            ...p,
            password: p.password ?? p.passwordHash ?? undefined,
          }))
        : [],
    };
  };

  /** Solo actualizar fotos en el servidor: consulta qué herramientas tienen fotos y sube solo las que falten o tengan menos. */
  const syncPhotosOnly = async (data: BackupData) => {
    const tools = data.herramientas ?? [];
    const withFotos = tools.filter((h: any) => Array.isArray(h.fotos) && h.fotos.length > 0);
    if (withFotos.length === 0) {
      toast({ title: "Sin fotos en el respaldo", description: "El archivo no tiene herramientas con fotos para actualizar." });
      return;
    }
    setIsLoading(true);
    setShowProgressBar(true);
    try {
      setProgress(10, 'Comprobando estado de fotos en el servidor...');
      const statusRes = await fetch('/api/loma/herramientas/photo-status', { credentials: 'include' });
      if (!statusRes.ok) throw new Error('No se pudo obtener el estado de fotos');
      const { items } = (await statusRes.json()) as { items: { id: string; photoCount: number }[] };
      const serverMap = new Map((items || []).map((i) => [i.id, i.photoCount]));

      const toSync = withFotos.filter((h: any) => {
        const backupCount = (h.fotos as unknown[]).length;
        const serverCount = serverMap.get(h.id) ?? 0;
        return backupCount > serverCount;
      });

      if (toSync.length === 0) {
        setProgress(100, 'No hay fotos que actualizar.');
        toast({ title: "No hay fotos que actualizar", description: "Todas las herramientas ya tienen las fotos del respaldo (o más)." });
        setTimeout(() => setShowProgressBar(false), 1500);
        setIsLoading(false);
        return;
      }

      const bodyStr = JSON.stringify({
        herramientas: toSync.map((h: any) => ({ id: h.id, fotos: h.fotos })),
      });
      setProgress(40, `Subiendo fotos de ${toSync.length} herramienta(s)... 0%`);
      const syncRes = await postWithUploadProgress(
        '/api/loma/sync-photos',
        bodyStr,
        (loaded, total) => {
          const pct = total ? Math.round((loaded / total) * 100) : 0;
          const bar = 40 + Math.round((loaded / total) * 60);
          setProgress(bar, `Subiendo fotos... ${pct}% (${formatBytes(loaded)} / ${formatBytes(total)})`);
        }
      );
      if (!syncRes.ok) {
        const err = (await syncRes.json()) as { error?: string };
        throw new Error(err?.error ?? `Error ${syncRes.status}`);
      }
      const result = (await syncRes.json()) as { updated?: number };
      setProgress(100, `Completado: ${result.updated ?? toSync.length} herramienta(s) actualizadas.`);
      toast({
        title: "Fotos actualizadas",
        description: `Se actualizaron las fotos de ${result.updated ?? toSync.length} herramienta(s).`,
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setProgress(0, '');
      setShowProgressBar(false);
      toast({
        variant: 'destructive',
        title: 'Error al actualizar fotos',
        description: e instanceof Error ? e.message : 'No se pudo conectar al servidor.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const restoreFromData = async (dataToRestore: BackupData) => {
    setIsLoading(true);
    setShowRestoreConfirmDialog(false);
    setShowProgressBar(true);
    setProgress(5, 'Iniciando restauración...');
    toast({ title: "Iniciando restauración...", description: "Por favor, no cierres esta página." });
    try {
      // 1) Intentar importar al servidor primero (sin fotos en el payload para que sea rápido)
      let serverSuccess = false;
      try {
        setProgress(15, 'Subiendo datos al servidor (herramientas, listas, personal)...');
        const basePayload = toServerPayload(dataToRestore);
        const importPayload = {
          ...basePayload,
          herramientas: (basePayload.herramientas || []).map((h: any) => ({ ...h, fotos: [] })),
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 min
        const res = await fetch('/api/loma/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importPayload),
          credentials: 'include',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          serverSuccess = true;
          const data = await res.json().catch(() => ({}));
          const counts = data?.counts ?? {};
          if (includeHerramientas && includeFotos) {
            const toolsWithFotos = (dataToRestore.herramientas ?? []).filter(
              (h: any) => Array.isArray(h.fotos) && h.fotos.length > 0
            );
            if (toolsWithFotos.length > 0) {
              const bodyStr = JSON.stringify({
                herramientas: toolsWithFotos.map((h: any) => ({ id: h.id, fotos: h.fotos })),
              });
              setProgress(50, `Subiendo fotos de ${toolsWithFotos.length} herramienta(s)... 0%`);
              const syncRes = await postWithUploadProgress(
                '/api/loma/sync-photos',
                bodyStr,
                (loaded, total) => {
                  const pct = total ? Math.round((loaded / total) * 100) : 0;
                  const bar = 50 + Math.round((loaded / total) * 50);
                  setProgress(bar, `Subiendo fotos... ${pct}% (${formatBytes(loaded)} / ${formatBytes(total)})`);
                }
              );
              if (!syncRes.ok) {
                console.warn('Sync fotos falló:', syncRes.status);
                toast({
                  title: "Fotos no subidas al servidor",
                  description: "Las fotos se guardaron en este navegador. Verás las fotos al abrir cada herramienta.",
                  variant: "default",
                });
                try {
                  const db = await openDB();
                  const tx = db.transaction(HERRAMIENTAS_STORE_NAME, 'readwrite');
                  const store = tx.objectStore(HERRAMIENTAS_STORE_NAME);
                  for (const tool of toolsWithFotos) {
                    store.put(tool);
                  }
                  await promisifyTx(tx);
                } catch (e) {
                  console.warn('No se pudieron guardar fotos en IndexedDB:', e);
                }
              }
            }
          }
          setProgress(100, 'Completado. Recargando...');
          toast({
            title: "Restauración en Servidor Completada",
            description: `Se importaron: ${counts.herramientas ?? 0} herramientas, ${counts.garantias ?? 0} listas, ${counts.personal ?? 0} personal. Recargando...`,
          });
          setRestoreData(null);
          setFileName('');
          setIsLoading(false);
          setTimeout(() => window.location.reload(), 1500);
          return;
        }
        const err = await res.json().catch(() => ({}));
        const errorMsg = (err as { error?: string })?.error ?? `Error ${res.status}`;
        if (res.status === 413) {
          toast({ title: "Archivo muy grande para el servidor", description: "El archivo supera el límite. Se restaura solo en este navegador.", variant: "destructive" });
        } else {
          toast({ title: "No se pudo subir al servidor", description: errorMsg, variant: "destructive" });
          console.warn('Importación al servidor falló:', res.status, err);
        }
      } catch (err) {
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        const msg = isTimeout ? 'Tardó demasiado. Desmarca "Incluir fotos" para importar más rápido.' : (err instanceof Error ? err.message : 'Sin conexión al servidor');
        toast({ title: isTimeout ? "Tiempo agotado" : "Servidor no disponible", description: msg + (isTimeout ? '' : ' Se restaura solo en este navegador.'), variant: "destructive" });
        console.warn('Servidor no disponible o timeout:', err);
      }

      // 2) Fallback: restaurar en IndexedDB solo lo seleccionado
      setProgress(60, 'Restaurando en este navegador (IndexedDB)...');
      const db = await openDB();
      const storesToClear: string[] = [];
      if (includeHerramientas) storesToClear.push(HERRAMIENTAS_STORE_NAME);
      if (includePersonal) storesToClear.push(PERSONAL_STORE_NAME);
      if (includeGarantias) storesToClear.push(GARANTIAS_STORE_NAME);
      if (storesToClear.length > 0) {
        const txClear = db.transaction(storesToClear, 'readwrite');
        await Promise.all(storesToClear.map(storeName => promisifyRequest(txClear.objectStore(storeName).clear())));
        await promisifyTx(txClear);

        const txWrite = db.transaction(storesToClear, 'readwrite');
        const addPromises: Promise<unknown>[] = [];
        if (includeHerramientas) {
          const tools = includeFotos ? (dataToRestore.herramientas ?? []) : (dataToRestore.herramientas ?? []).map((h: any) => ({ ...h, fotos: [] }));
          tools.forEach((item: any) => addPromises.push(promisifyRequest(txWrite.objectStore(HERRAMIENTAS_STORE_NAME).add(item))));
        }
        if (includePersonal) dataToRestore.personal?.forEach((item: any) => addPromises.push(promisifyRequest(txWrite.objectStore(PERSONAL_STORE_NAME).add(item))));
        if (includeGarantias) dataToRestore.listasGarantia?.forEach((item: any) => addPromises.push(promisifyRequest(txWrite.objectStore(GARANTIAS_STORE_NAME).add(item))));
        await Promise.all(addPromises);
        await promisifyTx(txWrite);
      }

      setProgress(100, serverSuccess ? 'Completado.' : 'Completado (solo en este navegador).');
      toast({
        title: "Restauración Completada",
        description: serverSuccess ? "Datos en el servidor." : "Los datos se restauraron en este navegador. Si el servidor no respondió, solo se verán aquí.",
      });
      setTimeout(() => setShowProgressBar(false), 2000);
    } catch (error) {
      setProgress(0, '');
      setShowProgressBar(false);
      toast({ variant: "destructive", title: "Error en la Restauración", description: error instanceof Error ? error.message : "Un error desconocido ocurrió." });
    } finally {
      setIsLoading(false);
      setRestoreData(null);
      setFileName('');
    }
  }

  const handleRestore = async () => {
    if (restoreData) await restoreFromData(restoreData);
  };

  const promisifyRequest = (request: IDBRequest) => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  const promisifyTx = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  const handleExportToDrive = async () => {
    if (!accessToken) { handleSignIn(); return; }
    setIsDriveLoading(true);
    toast({ title: "Subiendo a Google Drive...", description: "Preparando y enviando respaldo." });
    try {
      const backupData = await gatherBackupData();
      const fileContent = JSON.stringify(backupData, null, 2);
      
      const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_BACKUP_FILENAME}' and trashed=false and 'root' in parents&fields=files(id,name)`, { headers: { 'Authorization': `Bearer ${accessToken}` } });

      if (!searchResponse.ok) {
        if (searchResponse.status === 401) {
            handleSignOut();
            const errorMsg = "Tu sesión de Google ha expirado o no es válida. Por favor, vuelve a conectar tu cuenta.";
            setDriveError(errorMsg);
            toast({ title: "Sesión Expirada", description: "Vuelve a conectar con Google Drive.", variant: "destructive" });
            return;
        }
        const errorData = await searchResponse.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || `Error buscando archivo: ${searchResponse.statusText}. Asegúrate de que la API de Google Drive esté habilitada en tu proyecto de Google Cloud.`;
        throw new Error(errorMessage);
      }

      const existingFile = (await searchResponse.json()).files?.[0];
      const metadata = { name: DRIVE_BACKUP_FILENAME, mimeType: 'application/json' };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([fileContent], { type: 'application/json' }));
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files${existingFile ? `/${existingFile.id}` : ''}?uploadType=multipart`;
      const uploadMethod = existingFile ? 'PATCH' : 'POST';
      const uploadResponse = await fetch(uploadUrl, { method: uploadMethod, headers: { 'Authorization': `Bearer ${accessToken}` }, body: form });
      
      if (!uploadResponse.ok) {
           const errorData = await uploadResponse.json().catch(() => ({}));
           const errorMessage = errorData?.error?.message || `Error subiendo archivo: ${uploadResponse.statusText}`;
           throw new Error(errorMessage);
      }

      toast({ title: "Éxito", description: `Respaldo guardado en Google Drive como ${DRIVE_BACKUP_FILENAME}.` });
    } catch (error: any) {
      setDriveError(error.message);
      toast({ title: "Error al exportar", description: error.message, variant: "destructive" });
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleImportFromDrive = async () => {
    if (!accessToken) { handleSignIn(); return; }
    setIsDriveLoading(true);
    toast({ title: "Buscando en Google Drive...", description: "Buscando el archivo de respaldo." });
    try {
        const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_BACKUP_FILENAME}' and trashed=false and 'root' in parents&fields=files(id,name)`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        
        if (!searchResponse.ok) {
            if (searchResponse.status === 401) {
                handleSignOut();
                const errorMsg = "Tu sesión de Google ha expirado o no es válida. Por favor, vuelve a conectar tu cuenta.";
                setDriveError(errorMsg);
                toast({ title: "Sesión Expirada", description: "Vuelve a conectar con Google Drive.", variant: "destructive" });
                return;
            }
            const errorData = await searchResponse.json().catch(() => ({}));
            const errorMessage = errorData?.error?.message || `Error buscando archivo: ${searchResponse.statusText}. Asegúrate de que la API de Google Drive esté habilitada.`;
            throw new Error(errorMessage);
        }

        const file = (await searchResponse.json()).files?.[0];
        if (!file || !file.id) {
          throw new Error(`No se encontró el archivo ${DRIVE_BACKUP_FILENAME} en tu Google Drive.`);
        }

        toast({ title: "Descargando desde Drive...", description: "Puede tardar un momento si el archivo es grande." });
        const fileContentResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: { 'Authorization': `Bearer ${accessToken}` } });

        if (!fileContentResponse.ok) {
            const errorData = await fileContentResponse.json().catch(() => ({}));
            const errorMessage = errorData?.error?.message || `Error descargando archivo: ${fileContentResponse.statusText}`;
            throw new Error(errorMessage);
        }
        
        const raw = await fileContentResponse.json();
        const hasRequired = Array.isArray(raw.herramientas) && Array.isArray(raw.personal);
        if (!hasRequired) throw new Error("El archivo de Drive no tiene el formato esperado (herramientas, personal).");
        setRestoreData(normalizeBackup(raw));
        setShowRestoreConfirmDialog(true);
        setFileName(DRIVE_BACKUP_FILENAME);
    } catch (error: any) {
      setDriveError(error.message);
      toast({ title: "Error al importar", description: error.message, variant: "destructive" });
    } finally {
      setIsDriveLoading(false);
    }
  };
  
  const isApiReady = isGisLoaded && !!tokenClient;

  return (
    <div className="space-y-8">
      {showProgressBar && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm font-medium mb-2">{progressLabel}</p>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">{Math.round(progressPercent)}%</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Cloud className="h-6 w-6"/>
            Respaldo en la Nube con Google Drive
          </CardTitle>
          <CardDescription>
            Conecta tu cuenta para guardar y cargar respaldos desde tu Google Drive. Es el método recomendado para sincronizar dispositivos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {popupBlockedError && (
             <Alert variant="destructive" className="mb-4 border-4 border-dashed">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle className="text-xl font-extrabold text-destructive">¡Ventana emergente (Popup) Bloqueada!</AlertTitle>
                <AlertDescription className="text-base space-y-3 mt-2">
                  <p className="font-semibold">Tu navegador ha bloqueado la ventana de inicio de sesión de Google. Para continuar, necesitas permitirla.</p>
                  
                  <div className="pl-4 border-l-4 border-destructive/50 py-2">
                      <h4 className="font-bold text-lg">Solución General:</h4>
                      <p className="text-sm">Busca un ícono de <span className="font-bold">ventana bloqueada</span> (usualmente a la derecha en la barra de direcciones) y haz clic en él.</p>
                      <p className="text-sm">Selecciona la opción para <span className="font-bold">"Permitir siempre pop-ups y redirecciones de este sitio"</span> y haz clic en "Hecho".</p>
                      <p className="text-sm mt-2">Luego, intenta <span className="font-bold">conectar con Google Drive</span> de nuevo.</p>
                  </div>
                  
                  {isBrave && origin && (
                    <div className="border-t border-destructive/30 pt-3 mt-4">
                       <h4 className="font-bold text-lg">Instrucciones Específicas para Brave:</h4>
                       <p className="text-sm mt-1">
                          A veces, Brave requiere que agregues el sitio a una lista de permitidos. Ve a <code className="bg-muted px-2 py-1 rounded text-destructive-foreground/90 text-sm break-all">brave://settings/content/popups</code>, y en "Allowed...", agrega esta dirección: <code className="bg-muted px-2 py-1 rounded text-destructive-foreground/90 text-sm break-all">{origin}</code>.
                       </p>
                    </div>
                  )}
                   <p className="font-bold mt-3">¡Después de permitir los popups, puede que necesites recargar la página!</p>
                </AlertDescription>
              </Alert>
          )}

          {driveError && !popupBlockedError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error de conexión / configuración</AlertTitle>
              <AlertDescription>{driveError}</AlertDescription>
            </Alert>
          )}

          {oauthClientId === undefined && !driveError && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Leyendo configuración de Google…
            </div>
          )}
          {oauthClientId !== undefined && !isGisLoaded && !driveError && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando API de Google…
            </div>
          )}

          {isGisLoaded && !popupBlockedError && (
            <>
              {accessToken ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50">
                    <div className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-green-600" /><div><p className="font-semibold text-sm text-green-900 dark:text-green-200">Conectado a Google Drive</p><p className="text-xs text-green-700 dark:text-green-400">Puedes subir y bajar respaldos.</p></div></div>
                    <Button variant="outline" size="sm" onClick={handleSignOut}><LogOut className="mr-2 h-4 w-4" /> Desconectar</Button>
                  </div>
                  <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/50"><Info className="h-4 w-4 !text-blue-600 dark:!text-blue-400" /><AlertTitle className="text-blue-800 dark:text-blue-300">Respaldo Completo con Fotos</AlertTitle><AlertDescription className="text-blue-700 dark:text-blue-300/80">Al subir, se guardará un respaldo completo que incluye todas las fotos para facilitar la sincronización entre PC y móvil. Esto puede tardar un poco dependiendo de tu conexión.</AlertDescription></Alert>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleExportToDrive} disabled={isDriveLoading} className="w-full sm:w-auto">{isDriveLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CloudUpload className="mr-2 h-4 w-4"/>} Subir Respaldo a Drive</Button>
                    <Button onClick={handleImportFromDrive} disabled={isDriveLoading} variant="secondary" className="w-full sm:w-auto">{isDriveLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CloudDownload className="mr-2 h-4 w-4"/>} Cargar Respaldo desde Drive</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-4">
                  <p className="text-sm text-muted-foreground">Haz clic para iniciar sesión y dar permiso para guardar un único archivo de respaldo en tu Google Drive.</p>
                  <Button onClick={handleSignIn} variant="outline" disabled={!isApiReady}>{!isApiReady ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogIn className="mr-2 h-4 w-4"/>} Conectar con Google Drive</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><SettingsIcon className="h-6 w-6 text-primary"/>Respaldo y Restauración Local</CardTitle>
          <CardDescription>Exporta tus datos a un archivo local o restaura desde uno.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Exportar (Crear Respaldo Local)</h3>
            <p className="text-sm text-muted-foreground mb-3">Descarga un archivo JSON con todos los datos, incluyendo fotos. Guárdalo en un lugar seguro.</p>
            <Button onClick={handleExport} disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>} Exportar Todos los Datos</Button>
          </div>
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-2">Restaurar (Importar Respaldo Local)</h3>
             <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground"><div className="flex items-start gap-3"><AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" /><div><h4 className="font-bold text-destructive">¡Atención! Acción Destructiva</h4><p className="text-sm text-destructive/90">Restaurar desde un archivo reemplazará <span className="font-semibold">TODOS</span> los datos actuales en este dispositivo.</p></div></div></div>
            <div className="mt-4"><Label htmlFor="restore-file" className="text-sm font-medium">Seleccionar archivo de respaldo (.json)</Label><Input id="restore-file" type="file" accept=".json" onChange={handleFileSelect} className="mt-1" disabled={isLoading}/></div>
            {fileName && restoreData && !isLoading && (
              <div className="mt-4 p-3 border rounded-md bg-muted/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between flex-wrap gap-2">
                <p className="text-sm">Archivo listo: <span className="font-semibold">{fileName}</span></p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setShowRestoreConfirmDialog(true)} disabled={isLoading}>Restaurar desde Archivo</Button>
                  <Button variant="outline" onClick={() => syncPhotosOnly(restoreData)} disabled={isLoading} title="Solo sube fotos de herramientas que falten o tengan menos en el servidor">
                    Actualizar solo fotos
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpenCheck className="h-6 w-6 text-primary"/>Ajustes Adicionales</CardTitle>
          <CardDescription>Gestiona otras configuraciones de la aplicación.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Reglas de Garantía Personalizadas</h3>
            <p className="text-sm text-muted-foreground mb-3">Define reglas de garantía por CAT.NO. para productos con políticas especiales. Estas reglas tienen prioridad.</p>
            <Link href="/manage-warranty"><Button variant="outline">Administrar Reglas de Garantía<ExternalLink className="ml-2 h-4 w-4"/></Button></Link>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Entrenamiento Manual de Garantías</h3>
            <p className="text-sm text-muted-foreground mb-3">Agrega ejemplos manuales verificados de Milwaukee.com para mejorar la precisión del sistema de garantías.</p>
            <Link href="/warranty-training"><Button variant="outline">Entrenar Sistema de Garantías<ExternalLink className="ml-2 h-4 w-4"/></Button></Link>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Estadísticas del Sistema de Aprendizaje</h3>
            <WarrantyLearningStats />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showRestoreConfirmDialog} onOpenChange={setShowRestoreConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Restauración</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Archivo: <strong>{fileName}</strong>.</p>
                <p className="font-bold text-destructive">Se reemplazarán los datos actuales por lo que marques abajo. ¿Continuar?</p>
                <p className="text-sm text-muted-foreground">Marca qué quieres importar. Lo no marcado quedará vacío en el servidor.</p>
                <div className="grid gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="inc-herramientas" checked={includeHerramientas} onCheckedChange={(v) => setIncludeHerramientas(!!v)} />
                    <Label htmlFor="inc-herramientas" className="text-sm font-normal cursor-pointer">Herramientas</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="inc-personal" checked={includePersonal} onCheckedChange={(v) => setIncludePersonal(!!v)} />
                    <Label htmlFor="inc-personal" className="text-sm font-normal cursor-pointer">Personal</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="inc-garantias" checked={includeGarantias} onCheckedChange={(v) => setIncludeGarantias(!!v)} />
                    <Label htmlFor="inc-garantias" className="text-sm font-normal cursor-pointer">Listas de garantía</Label>
                  </div>
                  <div className="flex items-center gap-2 pl-4 border-l-2 border-muted">
                    <Checkbox id="inc-fotos" checked={includeFotos} onCheckedChange={(v) => setIncludeFotos(!!v)} disabled={!includeHerramientas} />
                    <Label htmlFor="inc-fotos" className="text-sm font-normal cursor-pointer">
                      Incluir fotos en herramientas {!includeHerramientas && '(activa primero Herramientas)'}
                    </Label>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRestoreConfirmDialog(false)} disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isLoading || (!includeHerramientas && !includePersonal && !includeGarantias)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Sí, restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Milwaukee Credentials Panel - Temporarily disabled */}
      {/* <MilwaukeeCredentialsPanel
        onUpdatesReceived={(updates) => {
          toast({
            title: "Actualizaciones de Milwaukee",
            description: `Se encontraron ${updates.length} actualización(es) en Milwaukee Tool.`
          });
        }}
      /> */}

      {/* Tracking Automation Panel */}
      <SimpleTrackingPanel
        onUpdatesReceived={(updates) => {
          toast({
            title: "Actualizaciones de Tracking",
            description: `Se actualizaron ${updates.length} lista(s) automáticamente.`
          });
        }}
      />

    </div>
  );
}
