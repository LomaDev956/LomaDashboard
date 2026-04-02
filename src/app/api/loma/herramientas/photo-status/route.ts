import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/loma/herramientas/photo-status
 * Devuelve solo id y cantidad de fotos de cada herramienta (sin las fotos en sí).
 * Sirve para comparar con un backup y subir solo las que falten o tengan menos fotos.
 */
export async function GET() {
  try {
    const rows = await prisma.lomaHerramienta.findMany({
      select: { id: true, fotos: true },
    });

    const items = rows.map((r) => {
      const fotos = typeof r.fotos === 'string' ? JSON.parse(r.fotos || '[]') : r.fotos;
      const arr = Array.isArray(fotos) ? fotos : [];
      return { id: r.id, photoCount: arr.length };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error GET /api/loma/herramientas/photo-status:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado de fotos' },
      { status: 500 }
    );
  }
}
