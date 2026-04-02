import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { broadcast } from '@/lib/realtime-broadcast';

const prisma = new PrismaClient();

/** Body: solo herramientas con id y fotos para actualizar */
interface SyncPhotosPayload {
  herramientas: Array<{ id: string; fotos: unknown[] }>;
}

/**
 * POST /api/loma/sync-photos
 * Actualiza solo el campo fotos de las herramientas existentes.
 * No crea ni borra herramientas; solo actualiza fotos donde el id existe.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncPhotosPayload;
    const { herramientas = [] } = body;

    if (!Array.isArray(herramientas)) {
      return NextResponse.json(
        { error: 'Formato inválido: se requiere herramientas (array)' },
        { status: 400 }
      );
    }

    let updated = 0;
    for (const h of herramientas) {
      if (!h.id || !Array.isArray(h.fotos)) continue;
      const fotosStr = JSON.stringify(h.fotos);
      const result = await prisma.lomaHerramienta.updateMany({
        where: { id: h.id },
        data: { fotos: fotosStr },
      });
      updated += result.count;
    }

    broadcast({ type: 'invalidate', resource: 'herramientas' });

    return NextResponse.json({
      ok: true,
      updated,
      total: herramientas.length,
    });
  } catch (error) {
    console.error('Error POST /api/loma/sync-photos:', error);
    return NextResponse.json(
      { error: 'Error al sincronizar fotos' },
      { status: 500 }
    );
  }
}
