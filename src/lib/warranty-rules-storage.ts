'use client';

import { openDB, RULES_STORE_NAME } from '@/db';

export interface WarrantyRule {
  id: string;
  catNo: string;
  years: number | null; 
  description: string;
  isLifetime?: boolean;
}

export async function getCustomWarrantyRules(): Promise<WarrantyRule[]> {
  if (typeof window === 'undefined') return [];
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(RULES_STORE_NAME, 'readonly');
      const store = transaction.objectStore(RULES_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as WarrantyRule[]);
      };
      request.onerror = (event) => {
        console.error("Error al obtener reglas de garantía personalizadas:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para getCustomWarrantyRules:", error);
    return [];
  }
}

export async function addCustomWarrantyRule(newRuleData: Omit<WarrantyRule, 'id'>): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const newRule: WarrantyRule = {
    ...newRuleData,
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(RULES_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(RULES_STORE_NAME);
      const request = store.add(newRule);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error("Error al agregar regla de garantía personalizada:", (event.target as IDBRequest).error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para addCustomWarrantyRule:", error);
    return false;
  }
}

export async function updateCustomWarrantyRule(updatedRule: WarrantyRule): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(RULES_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(RULES_STORE_NAME);
      const request = store.put(updatedRule);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error("Error al actualizar regla de garantía personalizada:", (event.target as IDBRequest).error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para updateCustomWarrantyRule:", error);
    return false;
  }
}

export async function deleteCustomWarrantyRule(ruleId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(RULES_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(RULES_STORE_NAME);
      const request = store.delete(ruleId);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error("Error al eliminar regla de garantía personalizada:", (event.target as IDBRequest).error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para deleteCustomWarrantyRule:", error);
    return false;
  }
}

// findCustomWarrantyRule might be more efficient if rules list is large and fetched once, then filtered in JS.
// For now, this implementation is simple. It can be optimized if needed by fetching all rules once in the component.
export async function findCustomWarrantyRule(catNo: string): Promise<WarrantyRule | undefined> {
  if (typeof window === 'undefined' || !catNo) return undefined;
  try {
    const rules = await getCustomWarrantyRules();
    return rules.find(rule => rule.catNo.trim().toLowerCase() === catNo.trim().toLowerCase());
  } catch (error) {
    console.error("Error en findCustomWarrantyRule:", error);
    return undefined;
  }
}
