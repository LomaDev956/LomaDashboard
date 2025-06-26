'use client';

import { openDB, PERSONAL_STORE_NAME } from '@/db';

export interface Personal {
  id: string; 
  nombre: string;
  apellido: string;
  email: string; 
  direccion: string;
  ciudad: string;
  estado: string; 
  codigoPostal: string;
  telefono: string; 
}

// --- ID Generation ---
export const generatePersonalId = (): string => {
  return `P-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
};


// --- CRUD Operations ---

export async function getPersonalList(): Promise<Personal[]> {
  if (typeof window === 'undefined') return [];
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PERSONAL_STORE_NAME, 'readonly');
      const store = transaction.objectStore(PERSONAL_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as Personal[]);
      };
      request.onerror = (event) => {
        console.error("Error al obtener lista de personal:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para getPersonalList:", error);
    return [];
  }
}

export async function addPersonal(newPersonalData: Omit<Personal, 'id'>): Promise<Personal | null> {
  if (typeof window === 'undefined') return null;
  try {
    const db = await openDB();
    const personalWithId: Personal = { ...newPersonalData, id: generatePersonalId() };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PERSONAL_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(PERSONAL_STORE_NAME);
      const request = store.add(personalWithId);

      request.onsuccess = () => {
        resolve(personalWithId);
      };
      request.onerror = (event) => {
        console.error("Error al agregar personal:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
       transaction.oncomplete = () => {};
       transaction.onerror = (event) => {
           console.error("Error en transacción de agregar personal:", (event.target as IDBTransaction).error);
           reject((event.target as IDBTransaction).error);
       };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para addPersonal:", error);
    return null;
  }
}

export async function updatePersonal(updatedPersonal: Personal): Promise<Personal | null> {
  if (typeof window === 'undefined') return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PERSONAL_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(PERSONAL_STORE_NAME);
      const request = store.put(updatedPersonal);

      request.onsuccess = () => {
        resolve(updatedPersonal);
      };
      request.onerror = (event) => {
        console.error("Error al actualizar personal:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
       transaction.oncomplete = () => {};
       transaction.onerror = (event) => {
           console.error("Error en transacción de actualizar personal:", (event.target as IDBTransaction).error);
           reject((event.target as IDBTransaction).error);
       };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para updatePersonal:", error);
    return null;
  }
}

export async function deletePersonal(personalId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PERSONAL_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(PERSONAL_STORE_NAME);
      const request = store.delete(personalId);

      request.onsuccess = () => {
        resolve(true);
      };
      request.onerror = (event) => {
        console.error("Error al eliminar personal:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      transaction.oncomplete = () => {};
      transaction.onerror = (event) => {
           console.error("Error en transacción de eliminar personal:", (event.target as IDBTransaction).error);
           reject((event.target as IDBTransaction).error);
       };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para deletePersonal:", error);
    return false;
  }
}
