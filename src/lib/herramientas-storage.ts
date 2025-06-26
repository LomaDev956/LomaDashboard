'use client';

import { isValid, parseISO, formatISO } from 'date-fns';
import { openDB, HERRAMIENTAS_STORE_NAME } from '@/db';

export interface HerramientaFoto {
  id: string;
  url: string; // Data URL de la imagen
  name?: string; // Nombre original del archivo, opcional
}

export type HerramientaCondicion = 'Nueva' | 'Usada';

export interface Herramienta {
  id: string; // Único e irrepetible
  catNo: string;
  toolName: string;
  serialNumber: string | null;
  falla: string | null;
  anosGarantia: number | null; // ej: 3, 5. null si no aplica o desconocido.
  fechaVencimientoGarantia: string | null; // Fecha en formato YYYY-MM-DD (ISO string date part only)
  fotos: HerramientaFoto[];
  estado: 'Operativa' | 'Requiere Reparación' | 'Vendido';
  condicion: HerramientaCondicion;
  fechaAgregado: string; // ISO date string
}

// --- ID Generation ---
export const generateHerramientaId = (): string => {
  return `H-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
};

// --- Date Helpers (unchanged) ---
export const dateToIsoString = (date: Date): string => {
  return formatISO(date, { representation: 'date' });
};

export const isoStringToDate = (isoString: string | null | undefined): Date | null => {
  if (!isoString) return null;
  const date = parseISO(isoString);
  return isValid(date) ? date : null;
};

// --- CRUD Operations ---

export async function getHerramientaById(id: string): Promise<Herramienta | undefined> {
  if (typeof window === 'undefined') return undefined;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(HERRAMIENTAS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(HERRAMIENTAS_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result as Herramienta | undefined);
      };
      request.onerror = (event) => {
        console.error(`Error al obtener herramienta por ID ${id}:`, (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error(`No se pudo abrir la base de datos para getHerramientaById (ID: ${id}):`, error);
    return undefined;
  }
}

export async function getHerramientasList(): Promise<Herramienta[]> {
  if (typeof window === 'undefined') return [];
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(HERRAMIENTAS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(HERRAMIENTAS_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as Herramienta[]);
      };
      request.onerror = (event) => {
        console.error("Error al obtener lista de herramientas:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para getHerramientasList:", error);
    return []; // Devuelve vacío si la BD no se puede abrir
  }
}

export async function addHerramienta(newHerramienta: Herramienta): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const db = await openDB();
    return new Promise((resolve) => { 
      const transaction = db.transaction(HERRAMIENTAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(HERRAMIENTAS_STORE_NAME);
      
      const getRequest = store.get(newHerramienta.id);
      getRequest.onsuccess = () => {
          if (getRequest.result) {
              console.warn(`Herramienta con ID ${newHerramienta.id} ya existe. Generando nuevo ID para asegurar adición única.`);
              newHerramienta.id = generateHerramientaId();
          }
          const addRequest = store.add(newHerramienta); 
          addRequest.onsuccess = () => resolve(true);
          addRequest.onerror = (event) => {
              console.error("Error al agregar herramienta (posiblemente ID duplicado tras regeneración o error de BD):", (event.target as IDBRequest).error);
              resolve(false); 
          };
      };
      getRequest.onerror = (event) => { 
          console.error("Error al verificar ID de herramienta para agregar:", (event.target as IDBRequest).error);
          resolve(false);
      };

      transaction.oncomplete = () => {
        // console.log("Transacción de agregar completada.");
      };
      transaction.onerror = (event) => { 
        console.error("Error en transacción de agregar:", (event.target as IDBTransaction).error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para addHerramienta:", error);
    return false;
  }
}

export async function updateHerramienta(updatedHerramienta: Herramienta): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(HERRAMIENTAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(HERRAMIENTAS_STORE_NAME);
      const request = store.put(updatedHerramienta); // put actualiza o inserta si no existe

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error("Error al actualizar herramienta:", (event.target as IDBRequest).error);
        resolve(false);
      };
      transaction.oncomplete = () => {
        // console.log("Transacción de actualizar completada.");
      };
      transaction.onerror = (event) => {
        console.error("Error en transacción de actualizar:", (event.target as IDBTransaction).error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para updateHerramienta:", error);
    return false;
  }
}

export async function deleteHerramienta(herramientaId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(HERRAMIENTAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(HERRAMIENTAS_STORE_NAME);
      const request = store.delete(herramientaId);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error("Error al eliminar herramienta:", (event.target as IDBRequest).error);
        resolve(false);
      };
      transaction.oncomplete = () => {
        // console.log("Transacción de eliminar completada.");
      };
      transaction.onerror = (event) => {
        console.error("Error en transacción de eliminar:", (event.target as IDBTransaction).error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para deleteHerramienta:", error);
    return false;
  }
}
