'use client';

import { openDB, KNOWLEDGE_STORE_NAME } from '@/db';

export interface CatNoKnowledge {
    catNo: string;
    toolName: string;
    lastUpdated: string; // ISO Date
}

export async function getAllCatNoKnowledge(): Promise<CatNoKnowledge[]> {
  if (typeof window === 'undefined') return [];
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KNOWLEDGE_STORE_NAME, 'readonly');
      const store = transaction.objectStore(KNOWLEDGE_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as CatNoKnowledge[]);
      };
      request.onerror = (event) => {
        console.error("Error fetching all CatNoKnowledge:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error("Could not open DB for getAllCatNoKnowledge:", error);
    return [];
  }
}

export async function saveCatNoKnowledge(catNo: string, toolName: string): Promise<boolean> {
    if (!catNo || !toolName || typeof window === 'undefined') return false;

    const knowledgeEntry: CatNoKnowledge = {
        catNo: catNo.trim().toUpperCase(),
        toolName: toolName.trim(),
        lastUpdated: new Date().toISOString()
    };
    
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(KNOWLEDGE_STORE_NAME, 'readwrite');
            const store = transaction.objectStore(KNOWLEDGE_STORE_NAME);
            const request = store.put(knowledgeEntry);
            request.onsuccess = () => resolve(true);
            request.onerror = () => {
                console.error("Error saving CAT.NO. knowledge:", request.error);
                resolve(false);
            };
        });
    } catch(error) {
        console.error("Could not open DB for saving CAT.NO. knowledge", error);
        return false;
    }
}

export async function getToolNameByCatNo(catNo: string): Promise<string | null> {
    if (!catNo || typeof window === 'undefined') return null;

    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(KNOWLEDGE_STORE_NAME, 'readonly');
            const store = transaction.objectStore(KNOWLEDGE_STORE_NAME);
            const request = store.get(catNo.trim().toUpperCase());
            request.onsuccess = () => {
                const result = request.result as CatNoKnowledge | undefined;
                resolve(result?.toolName || null);
            };
            request.onerror = () => {
                resolve(null);
            };
        });
    } catch(error) {
        return null;
    }
}
