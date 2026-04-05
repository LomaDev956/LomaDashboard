'use client';

import { openDB, WARRANTY_LEARNING_STORE_NAME } from '@/db';

export interface WarrantyLearningEntry {
  id: string;
  catNo: string;
  serialNumber: string;
  fechaCalculadaApp: string; // Fecha que calculó la app automáticamente
  fechaRealMilwaukee: string; // Fecha real de Milwaukee.com
  diferenciaDias: number; // Diferencia en días (positivo = Milwaukee es mayor)
  tipoProducto: 'herramienta' | 'bateria' | 'accesorio'; // Tipo detectado
  añosGarantia: number; // Años de garantía aplicados
  fechaAprendizaje: string; // Cuándo se hizo la corrección
  confianza: number; // Nivel de confianza (0-1)
}

// Función para agregar una entrada de aprendizaje
export async function addWarrantyLearningEntry(entry: Omit<WarrantyLearningEntry, 'id' | 'fechaAprendizaje'>): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  const newEntry: WarrantyLearningEntry = {
    ...entry,
    id: `learning_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fechaAprendizaje: new Date().toISOString()
  };

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(WARRANTY_LEARNING_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(WARRANTY_LEARNING_STORE_NAME);
      const request = store.add(newEntry);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error("Error adding warranty learning entry:", (event.target as IDBRequest).error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("Error opening database for warranty learning:", error);
    return false;
  }
}

// Función para obtener entradas de aprendizaje por CAT.NO.
export async function getLearningEntriesByCatNo(catNo: string): Promise<WarrantyLearningEntry[]> {
  if (typeof window === 'undefined' || !catNo.trim()) return [];
  
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(WARRANTY_LEARNING_STORE_NAME, 'readonly');
      const store = transaction.objectStore(WARRANTY_LEARNING_STORE_NAME);
      const index = store.index('catNo');
      const request = index.getAll(catNo.trim());

      request.onsuccess = () => {
        resolve(request.result as WarrantyLearningEntry[]);
      };
      request.onerror = (event) => {
        console.error(`Error getting learning entries for CAT.NO ${catNo}:`, (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error(`Error opening database for getLearningEntriesByCatNo (${catNo}):`, error);
    return [];
  }
}

// Función para calcular fecha mejorada basada en aprendizaje
export async function calculateImprovedWarrantyDate(
  catNo: string, 
  fechaCalculadaOriginal: string, 
  añosGarantia: number
): Promise<{ fechaMejorada: string; añosGarantiaMejorados: number | null; confianza: number; razon: string }> {
  
  const learningEntries = await getLearningEntriesByCatNo(catNo);
  
  if (learningEntries.length === 0) {
    return {
      fechaMejorada: fechaCalculadaOriginal,
      añosGarantiaMejorados: null,
      confianza: 0.5,
      razon: "Sin datos de aprendizaje previos"
    };
  }

  // Primero: Buscar si hay entradas con años de garantía diferentes (correcciones manuales)
  // Priorizar las correcciones más recientes
  const entradasOrdenadas = learningEntries.sort((a, b) => 
    new Date(b.fechaAprendizaje).getTime() - new Date(a.fechaAprendizaje).getTime()
  );
  
  // Obtener los años de garantía más comunes en las correcciones
  const añosGarantiaCount = entradasOrdenadas.reduce((acc, entry) => {
    acc[entry.añosGarantia] = (acc[entry.añosGarantia] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  // Encontrar los años de garantía más frecuentes
  const añosMasFrecuentes = Object.entries(añosGarantiaCount)
    .sort((a, b) => b[1] - a[1])[0];
  
  const añosAprendidos = añosMasFrecuentes ? parseInt(añosMasFrecuentes[0]) : null;

  // Calcular promedio de diferencias para los años de garantía aprendidos
  const diferenciasRelevantes = añosAprendidos !== null 
    ? learningEntries.filter(entry => entry.añosGarantia === añosAprendidos)
    : learningEntries.filter(entry => entry.añosGarantia === añosGarantia);
  
  if (diferenciasRelevantes.length === 0) {
    return {
      fechaMejorada: fechaCalculadaOriginal,
      añosGarantiaMejorados: null,
      confianza: 0.3,
      razon: "Sin datos para este período de garantía"
    };
  }

  const promedioDiferencia = diferenciasRelevantes.reduce((sum, entry) => sum + entry.diferenciaDias, 0) / diferenciasRelevantes.length;
  
  // Aplicar la corrección promedio
  const fechaOriginal = new Date(fechaCalculadaOriginal);
  const fechaMejorada = new Date(fechaOriginal);
  fechaMejorada.setDate(fechaMejorada.getDate() + Math.round(promedioDiferencia));
  
  const confianza = Math.min(0.9, 0.5 + (diferenciasRelevantes.length * 0.1));
  
  const razonBase = `Basado en ${diferenciasRelevantes.length} corrección(es) previa(s) (promedio: ${Math.round(promedioDiferencia)} días)`;
  const razonAños = añosAprendidos !== null && añosAprendidos !== añosGarantia 
    ? ` | Años de garantía corregidos: ${añosAprendidos} años`
    : '';
  
  return {
    fechaMejorada: fechaMejorada.toISOString().split('T')[0],
    añosGarantiaMejorados: añosAprendidos,
    confianza,
    razon: razonBase + razonAños
  };
}

// Función para eliminar todas las entradas de aprendizaje de un CAT.NO.
export async function deleteLearningEntriesByCatNo(catNo: string): Promise<boolean> {
  if (typeof window === 'undefined' || !catNo.trim()) return false;
  
  try {
    const entries = await getLearningEntriesByCatNo(catNo);
    if (entries.length === 0) return true; // No hay nada que eliminar
    
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(WARRANTY_LEARNING_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(WARRANTY_LEARNING_STORE_NAME);
      
      let deletedCount = 0;
      entries.forEach(entry => {
        const request = store.delete(entry.id);
        request.onsuccess = () => {
          deletedCount++;
          if (deletedCount === entries.length) {
            resolve(true);
          }
        };
        request.onerror = () => {
          resolve(false);
        };
      });
    });
  } catch (error) {
    console.error(`Error deleting learning entries for CAT.NO ${catNo}:`, error);
    return false;
  }
}

// Función para obtener estadísticas de aprendizaje
export async function getWarrantyLearningStats(): Promise<{
  totalEntries: number;
  uniqueCatNos: number;
  averageAccuracy: number;
  topCorrectedCatNos: { catNo: string; corrections: number }[];
}> {
  if (typeof window === 'undefined') return { totalEntries: 0, uniqueCatNos: 0, averageAccuracy: 0, topCorrectedCatNos: [] };
  
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(WARRANTY_LEARNING_STORE_NAME, 'readonly');
      const store = transaction.objectStore(WARRANTY_LEARNING_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as WarrantyLearningEntry[];
        
        const uniqueCatNos = new Set(entries.map(e => e.catNo)).size;
        const averageAccuracy = entries.length > 0 
          ? entries.reduce((sum, e) => sum + e.confianza, 0) / entries.length 
          : 0;
        
        // Contar correcciones por CAT.NO.
        const catNoCount = entries.reduce((acc, entry) => {
          acc[entry.catNo] = (acc[entry.catNo] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const topCorrectedCatNos = Object.entries(catNoCount)
          .map(([catNo, corrections]) => ({ catNo, corrections }))
          .sort((a, b) => b.corrections - a.corrections)
          .slice(0, 5);

        resolve({
          totalEntries: entries.length,
          uniqueCatNos,
          averageAccuracy,
          topCorrectedCatNos
        });
      };
      request.onerror = (event) => {
        console.error("Error getting warranty learning stats:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error("Error opening database for warranty learning stats:", error);
    return { totalEntries: 0, uniqueCatNos: 0, averageAccuracy: 0, topCorrectedCatNos: [] };
  }
}