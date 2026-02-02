'use client';

import { getHerramientasList } from './herramientas-storage';
import { getListasGarantia } from './garantias-storage';
import { getPersonalList } from './personal-storage';
import { openDB, HERRAMIENTAS_STORE_NAME, GARANTIAS_STORE_NAME, PERSONAL_STORE_NAME } from '@/db';

export interface BackupData {
  version: string;
  timestamp: string;
  herramientas: any[];
  garantias: any[];
  personal: any[];
}

export type ImportResult = { success: true; mode: 'server' } | { success: true; mode: 'local' } | { success: false; error?: string };

export async function exportAllData(): Promise<string> {
  try {
    const herramientas = await getHerramientasList();
    const garantias = await getListasGarantia();
    const personal = await getPersonalList();

    const backupData: BackupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      herramientas,
      garantias,
      personal
    };

    return JSON.stringify(backupData, null, 2);
  } catch (error) {
    console.error('Error al exportar datos:', error);
    throw new Error('No se pudieron exportar los datos');
  }
}

export async function downloadBackup(): Promise<void> {
  try {
    const jsonData = await exportAllData();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `lomatools-backup-${timestamp}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error al descargar backup:', error);
    throw error;
  }
}

export async function importAllData(jsonData: string): Promise<boolean> {
  try {
    const backupData: BackupData = JSON.parse(jsonData);
    
    if (!backupData.version || !backupData.herramientas || !backupData.garantias || !backupData.personal) {
      throw new Error('Formato de backup inválido');
    }

    const db = await openDB();
    
    // Limpiar datos existentes e importar nuevos
    const transaction = db.transaction([HERRAMIENTAS_STORE_NAME, GARANTIAS_STORE_NAME, PERSONAL_STORE_NAME], 'readwrite');
    
    // Limpiar herramientas
    const herramientasStore = transaction.objectStore(HERRAMIENTAS_STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const clearRequest = herramientasStore.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
    
    // Importar herramientas
    for (const herramienta of backupData.herramientas) {
      await new Promise<void>((resolve, reject) => {
        const addRequest = herramientasStore.add(herramienta);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      });
    }
    
    // Limpiar garantías
    const garantiasStore = transaction.objectStore(GARANTIAS_STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const clearRequest = garantiasStore.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
    
    // Importar garantías
    for (const garantia of backupData.garantias) {
      await new Promise<void>((resolve, reject) => {
        const addRequest = garantiasStore.add(garantia);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      });
    }
    
    // Limpiar personal
    const personalStore = transaction.objectStore(PERSONAL_STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const clearRequest = personalStore.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
    
    // Importar personal
    for (const persona of backupData.personal) {
      await new Promise<void>((resolve, reject) => {
        const addRequest = personalStore.add(persona);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error al importar datos:', error);
    return false;
  }
}

/**
 * Importa un backup: primero intenta subirlo al servidor (para que se vea en todos lados).
 * Si el servidor no está disponible, importa solo en este navegador (IndexedDB).
 */
export async function uploadAndImportBackup(file: File): Promise<ImportResult> {
  const jsonData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) resolve(text);
      else reject(new Error('Error al leer el archivo'));
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsText(file);
  });

  let backupData: BackupData;
  try {
    backupData = JSON.parse(jsonData);
    if (!backupData.version || !Array.isArray(backupData.herramientas) || !Array.isArray(backupData.garantias) || !Array.isArray(backupData.personal)) {
      return { success: false, error: 'Formato de backup inválido' };
    }
  } catch {
    return { success: false, error: 'El archivo no es un JSON válido' };
  }

  // 1) Intentar importar al servidor para que se vea en todos los dispositivos
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/loma/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData),
        credentials: 'include',
      });
      if (res.ok) {
        return { success: true, mode: 'server' };
      }
      const err = await res.json().catch(() => ({}));
      console.warn('Importación al servidor falló:', res.status, err);
    } catch (err) {
      console.warn('Servidor no disponible, importando solo en este navegador:', err);
    }
  }

  // 2) Fallback: importar solo en este navegador (IndexedDB)
  const success = await importAllData(jsonData);
  return success ? { success: true, mode: 'local' } : { success: false, error: 'Error al importar en este navegador' };
}