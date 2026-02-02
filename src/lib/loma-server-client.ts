/**
 * Cliente para las APIs LOMA en el servidor.
 * Usado cuando NEXT_PUBLIC_USE_SERVER_LOMA=true para que herramientas,
 * garantías y personal se lean/escriban en el servidor y se sincronicen en todos los dispositivos.
 */

import type { Herramienta } from '@/lib/herramientas-storage';
import type { ListaGarantia } from '@/lib/garantias-storage';
import type { Personal } from '@/lib/personal-storage';

const BASE = '';

const fetchOpts: RequestInit = { credentials: 'include' };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, fetchOpts);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json();
}

async function post(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    ...fetchOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path}: ${res.status}`);
}

async function put(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    ...fetchOpts,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path}: ${res.status}`);
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { ...fetchOpts, method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path}: ${res.status}`);
}

// --- Herramientas ---
export async function getHerramientasListApi(): Promise<Herramienta[]> {
  return get<Herramienta[]>('/api/loma/herramientas');
}

export async function getHerramientaByIdApi(id: string): Promise<Herramienta | undefined> {
  const res = await fetch(`${BASE}/api/loma/herramientas/${encodeURIComponent(id)}`, fetchOpts);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`GET herramienta: ${res.status}`);
  return res.json();
}

export async function addHerramientaApi(data: Herramienta): Promise<boolean> {
  await post('/api/loma/herramientas', data);
  return true;
}

export async function updateHerramientaApi(data: Herramienta): Promise<boolean> {
  await put(`/api/loma/herramientas/${encodeURIComponent(data.id)}`, data);
  return true;
}

export async function deleteHerramientaApi(id: string): Promise<boolean> {
  await del(`/api/loma/herramientas/${encodeURIComponent(id)}`);
  return true;
}

// --- Garantías (listas) ---
export async function getListasGarantiaApi(): Promise<ListaGarantia[]> {
  return get<ListaGarantia[]>('/api/loma/garantias');
}

export async function addListaGarantiaApi(data: ListaGarantia): Promise<boolean> {
  await post('/api/loma/garantias', data);
  return true;
}

export async function updateListaGarantiaApi(data: ListaGarantia): Promise<boolean> {
  await put(`/api/loma/garantias/${encodeURIComponent(data.id)}`, data);
  return true;
}

export async function deleteListaGarantiaApi(id: string): Promise<boolean> {
  await del(`/api/loma/garantias/${encodeURIComponent(id)}`);
  return true;
}

// --- Personal ---
export async function getPersonalListApi(): Promise<Personal[]> {
  return get<Personal[]>('/api/loma/personal');
}

export async function addPersonalApi(data: Personal): Promise<Personal | null> {
  await post('/api/loma/personal', { ...data, status: data.status ?? 'Activo' });
  return data;
}

export async function updatePersonalApi(data: Personal): Promise<Personal | null> {
  await put(`/api/loma/personal/${encodeURIComponent(data.id)}`, data);
  return data;
}

export async function deletePersonalApi(id: string): Promise<boolean> {
  await del(`/api/loma/personal/${encodeURIComponent(id)}`);
  return true;
}

export function useServerLoma(): boolean {
  if (typeof window === 'undefined') return false;
  return process.env.NEXT_PUBLIC_USE_SERVER_LOMA === 'true';
}

/** Comprueba si la API del servidor responde (datos en servidor). Si falla, los datos son locales (IndexedDB). */
export async function checkServerDataAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch(`${BASE}/api/loma/herramientas`, { ...fetchOpts, method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
