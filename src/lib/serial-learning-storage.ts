'use client';

import { openDB, SERIAL_LEARNING_STORE_NAME } from '@/db';

export interface SerialLearningEntry {
  id: string;
  serialNumber: string;
  catNo: string;
  fechaCalculadaApp: string; // Fecha que calculó la app automáticamente
  fechaRealMilwaukee: string; // Fecha real de Milwaukee.com
  diferenciaDias: number; // Diferencia en días
  fechaAprendizaje: string; // Cuándo se hizo la corrección
  confianza: number; // Nivel de confianza (0-1)
}

// Función para agregar aprendizaje de serial específico
export async function addSerialLearningEntry(entry: Omit<SerialLearningEntry, 'id' | 'fechaAprendizaje'>): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(SERIAL_LEARNING_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(SERIAL_LEARNING_STORE_NAME);
      const index = store.index('serialNumber');
      
      // Primero buscar si ya existe un registro con este serial
      const getRequest = index.get(entry.serialNumber.trim());
      
      getRequest.onsuccess = () => {
        const existingEntry = getRequest.result as SerialLearningEntry;
        
        let finalEntry: SerialLearningEntry;
        
        if (existingEntry) {
          // Si existe, actualizar el registro existente
          finalEntry = {
            ...existingEntry,
            catNo: entry.catNo,
            fechaCalculadaApp: entry.fechaCalculadaApp,
            fechaRealMilwaukee: entry.fechaRealMilwaukee,
            diferenciaDias: entry.diferenciaDias,
            confianza: entry.confianza,
            fechaAprendizaje: new Date().toISOString()
          };
        } else {
          // Si no existe, crear uno nuevo
          finalEntry = {
            ...entry,
            id: `serial_learning_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fechaAprendizaje: new Date().toISOString()
          };
        }
        
        // Guardar (put sobrescribe si existe)
        const putRequest = store.put(finalEntry);
        
        putRequest.onsuccess = () => resolve(true);
        putRequest.onerror = (event) => {
          console.error("Error adding serial learning entry:", (event.target as IDBRequest).error);
          resolve(false);
        };
      };
      
      getRequest.onerror = (event) => {
        console.error("Error checking existing serial learning entry:", (event.target as IDBRequest).error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("Error opening database for serial learning:", error);
    return false;
  }
}

// Función para obtener aprendizaje por serial específico
export async function getSerialLearning(serialNumber: string): Promise<SerialLearningEntry | null> {
  if (typeof window === 'undefined' || !serialNumber.trim()) return null;
  
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SERIAL_LEARNING_STORE_NAME, 'readonly');
      const store = transaction.objectStore(SERIAL_LEARNING_STORE_NAME);
      const index = store.index('serialNumber');
      const request = index.get(serialNumber.trim());

      request.onsuccess = () => {
        resolve(request.result as SerialLearningEntry || null);
      };
      request.onerror = (event) => {
        console.error(`Error getting serial learning for ${serialNumber}:`, (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error(`Error opening database for getSerialLearning (${serialNumber}):`, error);
    return null;
  }
}

// Función para aplicar aprendizaje de serial a fecha calculada
export async function applySerialLearning(
  serialNumber: string, 
  fechaCalculadaOriginal: string
): Promise<{ fechaMejorada: string; confianza: number; razon: string; aprendizajeAplicado: boolean }> {
  
  const serialLearning = await getSerialLearning(serialNumber);
  
  if (!serialLearning) {
    return {
      fechaMejorada: fechaCalculadaOriginal,
      confianza: 0.5,
      razon: "Sin aprendizaje previo para este serial",
      aprendizajeAplicado: false
    };
  }

  // Aplicar la corrección específica del serial
  const fechaOriginal = new Date(fechaCalculadaOriginal);
  const fechaMejorada = new Date(fechaOriginal);
  fechaMejorada.setDate(fechaMejorada.getDate() + serialLearning.diferenciaDias);
  
  return {
    fechaMejorada: fechaMejorada.toISOString().split('T')[0],
    confianza: serialLearning.confianza,
    razon: `Corrección específica para este serial (${serialLearning.diferenciaDias} días)`,
    aprendizajeAplicado: true
  };
}

// Función para obtener estadísticas de aprendizaje de seriales
export async function getSerialLearningStats(): Promise<{
  totalSerials: number;
  averageAccuracy: number;
  recentLearnings: SerialLearningEntry[];
}> {
  if (typeof window === 'undefined') return { totalSerials: 0, averageAccuracy: 0, recentLearnings: [] };
  
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SERIAL_LEARNING_STORE_NAME, 'readonly');
      const store = transaction.objectStore(SERIAL_LEARNING_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as SerialLearningEntry[];
        
        const averageAccuracy = entries.length > 0 
          ? entries.reduce((sum, e) => sum + e.confianza, 0) / entries.length 
          : 0;
        
        // Obtener los 10 aprendizajes más recientes
        const recentLearnings = entries
          .sort((a, b) => new Date(b.fechaAprendizaje).getTime() - new Date(a.fechaAprendizaje).getTime())
          .slice(0, 10);

        resolve({
          totalSerials: entries.length,
          averageAccuracy,
          recentLearnings
        });
      };
      request.onerror = (event) => {
        console.error("Error getting serial learning stats:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error("Error opening database for serial learning stats:", error);
    return { totalSerials: 0, averageAccuracy: 0, recentLearnings: [] };
  }
}