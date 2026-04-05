'use client';

import { openDB, KNOWLEDGE_STORE_NAME } from '@/db';

export interface CatNoKnowledge {
  catNo: string;
  toolName: string;
  lastUpdated: string;
  usageCount: number;
  isVerified: boolean; // Si ha sido verificado/corregido manualmente
}

// Función para verificar si un CAT.NO. existe en la base de conocimiento
export async function isCatNoKnown(catNo: string): Promise<boolean> {
  if (typeof window === 'undefined' || !catNo.trim()) return false;
  
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KNOWLEDGE_STORE_NAME, 'readonly');
      const store = transaction.objectStore(KNOWLEDGE_STORE_NAME);
      const request = store.get(catNo.trim());

      request.onsuccess = () => {
        resolve(!!request.result);
      };
      request.onerror = (event) => {
        console.error(`Error checking CAT.NO ${catNo}:`, (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error(`Error opening database for isCatNoKnown (${catNo}):`, error);
    return false;
  }
}

// Función para obtener información de un CAT.NO.
export async function getCatNoKnowledge(catNo: string): Promise<CatNoKnowledge | null> {
  if (typeof window === 'undefined' || !catNo.trim()) return null;
  
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KNOWLEDGE_STORE_NAME, 'readonly');
      const store = transaction.objectStore(KNOWLEDGE_STORE_NAME);
      const request = store.get(catNo.trim());

      request.onsuccess = () => {
        resolve(request.result as CatNoKnowledge || null);
      };
      request.onerror = (event) => {
        console.error(`Error getting CAT.NO knowledge ${catNo}:`, (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error(`Error opening database for getCatNoKnowledge (${catNo}):`, error);
    return null;
  }
}

// Función para agregar o actualizar conocimiento de CAT.NO.
export async function addOrUpdateCatNoKnowledge(
  catNo: string, 
  toolName: string, 
  isVerified: boolean = false
): Promise<boolean> {
  if (typeof window === 'undefined' || !catNo.trim() || !toolName.trim()) return false;
  
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(KNOWLEDGE_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(KNOWLEDGE_STORE_NAME);
      
      // Primero intentar obtener el registro existente
      const getRequest = store.get(catNo.trim());
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result as CatNoKnowledge;
        
        const knowledge: CatNoKnowledge = {
          catNo: catNo.trim(),
          toolName: toolName.trim(),
          lastUpdated: new Date().toISOString(),
          usageCount: existing ? existing.usageCount + 1 : 1,
          isVerified: isVerified || (existing?.isVerified || false)
        };
        
        const putRequest = store.put(knowledge);
        putRequest.onsuccess = () => resolve(true);
        putRequest.onerror = () => resolve(false);
      };
      
      getRequest.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error(`Error adding/updating CAT.NO knowledge (${catNo}):`, error);
    return false;
  }
}

// Función para marcar un CAT.NO. como verificado
export async function markCatNoAsVerified(catNo: string): Promise<boolean> {
  if (typeof window === 'undefined' || !catNo.trim()) return false;
  
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(KNOWLEDGE_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(KNOWLEDGE_STORE_NAME);
      const getRequest = store.get(catNo.trim());
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result as CatNoKnowledge;
        if (existing) {
          existing.isVerified = true;
          existing.lastUpdated = new Date().toISOString();
          
          const putRequest = store.put(existing);
          putRequest.onsuccess = () => resolve(true);
          putRequest.onerror = () => resolve(false);
        } else {
          resolve(false);
        }
      };
      
      getRequest.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error(`Error marking CAT.NO as verified (${catNo}):`, error);
    return false;
  }
}

// Función para obtener estadísticas de la base de conocimiento
export async function getKnowledgeBaseStats(): Promise<{
  totalCatNos: number;
  verifiedCatNos: number;
  mostUsedCatNos: { catNo: string; toolName: string; usageCount: number }[];
}> {
  if (typeof window === 'undefined') return { totalCatNos: 0, verifiedCatNos: 0, mostUsedCatNos: [] };
  
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KNOWLEDGE_STORE_NAME, 'readonly');
      const store = transaction.objectStore(KNOWLEDGE_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CatNoKnowledge[];
        
        const totalCatNos = entries.length;
        const verifiedCatNos = entries.filter(e => e.isVerified).length;
        const mostUsedCatNos = entries
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, 10)
          .map(e => ({ catNo: e.catNo, toolName: e.toolName, usageCount: e.usageCount }));

        resolve({ totalCatNos, verifiedCatNos, mostUsedCatNos });
      };
      request.onerror = (event) => {
        console.error("Error getting knowledge base stats:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error("Error opening database for knowledge base stats:", error);
    return { totalCatNos: 0, verifiedCatNos: 0, mostUsedCatNos: [] };
  }
}