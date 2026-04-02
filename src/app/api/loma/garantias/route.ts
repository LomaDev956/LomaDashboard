import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { broadcast } from '@/lib/realtime-broadcast';

const prisma = new PrismaClient();

/** GET - Listar todas las listas de garantía */
export async function GET() {
  try {
    const rows = await prisma.lomaListaGarantia.findMany({
      orderBy: { fechaCreacion: 'desc' },
    });
    const listas = rows.map((r) => ({
      id: r.id,
      nombreLista: r.nombreLista,
      articulos: typeof r.articulos === 'string' ? JSON.parse(r.articulos || '[]') : r.articulos,
      personalId: r.personalId,
      fechaCreacion: r.fechaCreacion,
      fechaEnvio: r.fechaEnvio,
      estado: r.estado,
      notas: r.notas,
      trackingIda: r.trackingIda,
      trackingVenida: r.trackingVenida,
    }));
    return NextResponse.json(listas);
  } catch (error) {
    console.error('Error GET /api/loma/garantias:', error);
    return NextResponse.json({ error: 'Error al obtener listas de garantía' }, { status: 500 });
  }
}

/** POST - Crear lista de garantía */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      nombreLista,
      articulos,
      personalId,
      fechaCreacion,
      fechaEnvio,
      estado,
      notas,
      trackingIda,
      trackingVenida,
    } = body;

    if (!id || !nombreLista || !fechaCreacion) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: id, nombreLista, fechaCreacion' },
        { status: 400 }
      );
    }

    const articulosStr = typeof articulos === 'string' ? articulos : JSON.stringify(articulos ?? []);

    await prisma.lomaListaGarantia.create({
      data: {
        id,
        nombreLista,
        articulos: articulosStr,
        personalId: personalId ?? null,
        fechaCreacion,
        fechaEnvio: fechaEnvio ?? null,
        estado: estado ?? 'En Preparación',
        notas: notas ?? null,
        trackingIda: trackingIda ?? null,
        trackingVenida: trackingVenida ?? null,
      },
    });

    broadcast({ type: 'invalidate', resource: 'garantias' });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Error POST /api/loma/garantias:', error);
    return NextResponse.json({ error: 'Error al crear lista de garantía' }, { status: 500 });
  }
}
