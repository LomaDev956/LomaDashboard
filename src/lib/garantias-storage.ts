
'use client';

import type { Herramienta } from './herramientas-storage';
import type { Personal } from './personal-storage';
import { openDB, GARANTIAS_STORE_NAME } from '@/db';

export interface ArticuloGarantia {
  herramientaId: string; // ID of the Herramienta
}

export type ListaGarantiaEstado = "En Preparación" | "Enviada" | "En Proceso" | "Finalizada con Devoluciones" | "Cancelada";

export const ESTADOS_GARANTIA: ListaGarantiaEstado[] = [
  "En Preparación", 
  "Enviada", 
  "En Proceso", 
  "Finalizada con Devoluciones", 
  "Cancelada"
];

export interface ListaGarantia {
  id: string; // Unique ID for the warranty list (e.g., LG-timestamp-random)
  nombreLista: string; // User-facing sequential name (e.g., GL-001)
  articulos: ArticuloGarantia[];
  personalId: string | null; // ID of the Personal member associated
  fechaCreacion: string; // ISO date string
  fechaEnvio?: string | null; // ISO date string
  estado: ListaGarantiaEstado;
  notas?: string;
}

export const generateListaGarantiaId = (): string => {
  return `LG-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
};

export async function generateListaGarantiaNombre(): Promise<string> {
  const listas = await getListasGarantia();
  if (listas.length === 0) {
    return "GL-001";
  }
  let maxNum = 0;
  listas.forEach(lista => {
    if (lista.nombreLista && lista.nombreLista.startsWith("GL-")) {
      const numPart = parseInt(lista.nombreLista.substring(3), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });
  const nextNum = maxNum + 1;
  return `GL-${String(nextNum).padStart(3, '0')}`;
};


export async function getListasGarantia(): Promise<ListaGarantia[]> {
  if (typeof window === 'undefined') return [];
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(GARANTIAS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(GARANTIAS_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const sortedListas = (request.result as ListaGarantia[]).sort((a, b) => 
            new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
        );
        resolve(sortedListas);
      };
      request.onerror = (event) => {
        console.error("Error al obtener listas de garantía:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para getListasGarantia:", error);
    return [];
  }
}

export async function addListaGarantia(newListaData: Omit<ListaGarantia, 'id' | 'nombreLista'> & { nombreLista?: string, id?:string }): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const db = await openDB();
    const listas = await getListasGarantia(); // For uniqueness checks

    let finalId = newListaData.id || generateListaGarantiaId();
    if (listas.some(l => l.id === finalId)) {
        console.warn(`Lista de garantía con ID de sistema ${finalId} ya existe. Generando nuevo ID.`);
        finalId = generateListaGarantiaId();
    }
    
    let finalNombreLista = newListaData.nombreLista || await generateListaGarantiaNombre();
    if (listas.some(l => l.nombreLista === finalNombreLista && l.id !== finalId)) {
        console.warn(`Lista de garantía con nombre ${finalNombreLista} ya existe. Regenerando nombre.`);
        finalNombreLista = await generateListaGarantiaNombre();
    }

    const newLista: ListaGarantia = {
        ...newListaData,
        id: finalId,
        nombreLista: finalNombreLista,
    } as ListaGarantia; // Cast because input might miss id/nombreLista initially

    return new Promise((resolve) => {
      const transaction = db.transaction(GARANTIAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(GARANTIAS_STORE_NAME);
      const request = store.add(newLista);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error("Error al agregar lista de garantía:", (event.target as IDBRequest).error);
        resolve(false);
      };
      transaction.oncomplete = () => {};
      transaction.onerror = (event) => {
        console.error("Error en transacción de agregar lista de garantía:", (event.target as IDBTransaction).error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos o procesar para addListaGarantia:", error);
    return false;
  }
}

export async function updateListaGarantia(updatedLista: ListaGarantia): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(GARANTIAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(GARANTIAS_STORE_NAME);
      const request = store.put(updatedLista);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error("Error al actualizar lista de garantía:", (event.target as IDBRequest).error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para updateListaGarantia:", error);
    return false;
  }
}

export async function updateListaGarantiaEstado(listaId: string, nuevoEstado: ListaGarantiaEstado): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const db = await openDB();
    return new Promise(async (resolve) => { // Mark outer promise as async
      const transaction = db.transaction(GARANTIAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(GARANTIAS_STORE_NAME);
      const getRequest = store.get(listaId);

      getRequest.onsuccess = async () => { // Mark onsuccess as async
        const lista = getRequest.result as ListaGarantia | undefined;
        if (lista) {
          lista.estado = nuevoEstado;
          if (nuevoEstado === "Enviada" && !lista.fechaEnvio) {
            lista.fechaEnvio = new Date().toISOString();
          }
          const putRequest = store.put(lista);
          putRequest.onsuccess = () => resolve(true);
          putRequest.onerror = (event) => {
            console.error("Error al guardar lista de garantía actualizada (estado):", (event.target as IDBRequest).error);
            resolve(false);
          };
        } else {
          console.warn(`No se encontró lista de garantía con ID ${listaId} para actualizar estado.`);
          resolve(false);
        }
      };
      getRequest.onerror = (event) => {
        console.error("Error al obtener lista de garantía para actualizar estado:", (event.target as IDBRequest).error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para updateListaGarantiaEstado:", error);
    return false;
  }
}

export async function deleteListaGarantia(listaId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(GARANTIAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(GARANTIAS_STORE_NAME);
      const request = store.delete(listaId);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error("Error al eliminar lista de garantía:", (event.target as IDBRequest).error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("No se pudo abrir la base de datos para deleteListaGarantia:", error);
    return false;
  }
}

export async function isHerramientaInActiveList(herramientaId: string, allListasInput?: ListaGarantia[]): Promise<boolean> {
  const listas = allListasInput || await getListasGarantia();
  return listas.some(lista =>
    (lista.estado !== "Finalizada con Devoluciones" && lista.estado !== "Cancelada") &&
    lista.articulos.some(articulo => articulo.herramientaId === herramientaId)
  );
}

export async function countListasByPersonal(personalId: string, allListasInput?: ListaGarantia[]): Promise<number> {
    const listas = allListasInput || await getListasGarantia();
    return listas.filter(lista => lista.personalId === personalId).length;
};

    
