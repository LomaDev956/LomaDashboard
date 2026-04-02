import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/loma/stats
 * Devuelve solo los conteos para el dashboard (sin fotos ni datos completos).
 * Esto hace que el dashboard cargue mucho más rápido.
 */
export async function GET() {
  try {
    // Obtener conteos directamente sin cargar datos completos
    const [
      totalHerramientas,
      herramientasVendidas,
      herramientasRequierenReparacion,
      totalPersonal,
      personalActivo,
      totalListasGarantia,
      listasGarantiaActivas,
      listasGarantiaActivasData,
    ] = await Promise.all([
      prisma.lomaHerramienta.count({
        where: {
          estado: { in: ['Operativa', 'Requiere Reparación'] },
        },
      }),
      prisma.lomaHerramienta.count({
        where: { estado: 'Vendido' },
      }),
      prisma.lomaHerramienta.findMany({
        where: { estado: 'Requiere Reparación' },
        select: { id: true }, // Solo IDs para verificar si están en listas activas
      }),
      prisma.lomaPersonal.count(),
      prisma.lomaPersonal.count({
        where: { status: 'Activo' },
      }),
      prisma.lomaListaGarantia.count(),
      prisma.lomaListaGarantia.count({
        where: {
          estado: { in: ['En Preparación', 'Enviada'] },
        },
      }),
      prisma.lomaListaGarantia.findMany({
        where: {
          estado: { in: ['En Preparación', 'Enviada'] },
        },
        select: { articulos: true }, // Solo articulos para verificar IDs
      }),
    ]);

    // Calcular herramientas pendientes (requieren reparación pero NO están en listas activas)
    const herramientasEnListasActivas = new Set<string>();
    for (const lista of listasGarantiaActivasData) {
      const articulos = typeof lista.articulos === 'string' 
        ? JSON.parse(lista.articulos || '[]') 
        : lista.articulos || [];
      for (const art of articulos) {
        if (art.herramientaId) {
          herramientasEnListasActivas.add(art.herramientaId);
        }
      }
    }
    const herramientasPendientes = herramientasRequierenReparacion.filter(
      h => !herramientasEnListasActivas.has(h.id)
    ).length;

    return NextResponse.json({
      herramientas: {
        total: totalHerramientas,
        vendidas: herramientasVendidas,
        pendientes: herramientasPendientes,
      },
      personal: {
        total: totalPersonal,
        activo: personalActivo,
        inactivo: totalPersonal - personalActivo,
      },
      garantias: {
        total: totalListasGarantia,
        activas: listasGarantiaActivas,
      },
    });
  } catch (error) {
    console.error('Error GET /api/loma/stats:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
