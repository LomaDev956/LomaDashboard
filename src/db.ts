
'use client';

export const DB_NAME = 'LomaToolsDB';
export const DB_VERSION = 11; // Incremented version to trigger onupgradeneeded
export const HERRAMIENTAS_STORE_NAME = 'herramientas';
export const PERSONAL_STORE_NAME = 'personal';
export const GARANTIAS_STORE_NAME = 'listasGarantia';
export const RULES_STORE_NAME = 'customWarrantyRules';
export const KNOWLEDGE_STORE_NAME = 'catNoKnowledgeBase';
export const WARRANTY_LEARNING_STORE_NAME = 'warrantyLearning';
export const SERIAL_LEARNING_STORE_NAME = 'serialLearning';

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      console.warn("IndexedDB not available in this environment.");
      return reject(new Error("IndexedDB not available"));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction;

      if (!transaction) {
          console.error("DB upgrade failed: no transaction available.");
          return;
      }

      // --- Handle 'herramientas' store ---
      let herramientasStore;
      if (!db.objectStoreNames.contains(HERRAMIENTAS_STORE_NAME)) {
        herramientasStore = db.createObjectStore(HERRAMIENTAS_STORE_NAME, { keyPath: 'id' });
      } else {
        herramientasStore = transaction.objectStore(HERRAMIENTAS_STORE_NAME);
      }

      // Add/update indices for 'herramientas'
      if (!herramientasStore.indexNames.contains('catNo')) {
        herramientasStore.createIndex('catNo', 'catNo', { unique: false });
      }
      if (!herramientasStore.indexNames.contains('toolName')) {
        herramientasStore.createIndex('toolName', 'toolName', { unique: false });
      }
      if (!herramientasStore.indexNames.contains('fechaAgregado')) {
        herramientasStore.createIndex('fechaAgregado', 'fechaAgregado', { unique: false });
      }
      if (!herramientasStore.indexNames.contains('condicion')) {
        herramientasStore.createIndex('condicion', 'condicion', { unique: false });
      }
       if (!herramientasStore.indexNames.contains('estado')) {
        herramientasStore.createIndex('estado', 'estado', { unique: false });
      }
       if (!herramientasStore.indexNames.contains('serialNumber')) {
        herramientasStore.createIndex('serialNumber', 'serialNumber', { unique: false });
      }
      
      // --- Handle 'personal' store ---
      if (!db.objectStoreNames.contains(PERSONAL_STORE_NAME)) {
        const store = db.createObjectStore(PERSONAL_STORE_NAME, { keyPath: 'id' });
        store.createIndex('nombreCompleto', ['apellido', 'nombre'], { unique: false });
        store.createIndex('email', 'email', { unique: true });
      } else {
        const store = transaction.objectStore(PERSONAL_STORE_NAME);
        if (!store.indexNames.contains('email')) {
            store.createIndex('email', 'email', { unique: true });
        }
      }

      // --- Handle 'listasGarantia' store ---
      if (!db.objectStoreNames.contains(GARANTIAS_STORE_NAME)) {
        const store = db.createObjectStore(GARANTIAS_STORE_NAME, { keyPath: 'id' });
        store.createIndex('nombreLista', 'nombreLista', { unique: true });
        store.createIndex('fechaCreacion', 'fechaCreacion', { unique: false });
        store.createIndex('personalId', 'personalId', { unique: false });
      } else {
         const store = transaction.objectStore(GARANTIAS_STORE_NAME);
         if (!store.indexNames.contains('nombreLista')) {
            store.createIndex('nombreLista', 'nombreLista', { unique: true });
         }
      }

      // --- Handle 'customWarrantyRules' store ---
      if (!db.objectStoreNames.contains(RULES_STORE_NAME)) {
        const store = db.createObjectStore(RULES_STORE_NAME, { keyPath: 'id' });
        store.createIndex('catNo', 'catNo', { unique: false });
      }

      // --- Handle 'catNoKnowledgeBase' store ---
      if (!db.objectStoreNames.contains(KNOWLEDGE_STORE_NAME)) {
        const store = db.createObjectStore(KNOWLEDGE_STORE_NAME, { keyPath: 'catNo' });
        store.createIndex('toolName', 'toolName', { unique: false });
      }

      // --- Handle 'warrantyLearning' store ---
      if (!db.objectStoreNames.contains(WARRANTY_LEARNING_STORE_NAME)) {
        const store = db.createObjectStore(WARRANTY_LEARNING_STORE_NAME, { keyPath: 'id' });
        store.createIndex('catNo', 'catNo', { unique: false });
        store.createIndex('serialNumber', 'serialNumber', { unique: false });
        store.createIndex('fechaAprendizaje', 'fechaAprendizaje', { unique: false });
        store.createIndex('tipoProducto', 'tipoProducto', { unique: false });
      }

      // --- Handle 'serialLearning' store ---
      if (!db.objectStoreNames.contains(SERIAL_LEARNING_STORE_NAME)) {
        const store = db.createObjectStore(SERIAL_LEARNING_STORE_NAME, { keyPath: 'id' });
        store.createIndex('serialNumber', 'serialNumber', { unique: true });
        store.createIndex('catNo', 'catNo', { unique: false });
        store.createIndex('fechaAprendizaje', 'fechaAprendizaje', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error(`Error opening DB '${DB_NAME}':`, (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}
