import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { broadcast } from '@/lib/realtime-broadcast';

const prisma = new PrismaClient();

/** GET - Obtener una lista de garantía por id */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const r = await prisma.lomaListaGarantia.findUnique({ where: { id } });
    if (!r) return NextResponse.json(null, { status: 404 });
    const lista = {
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
    };
    return NextResponse.json(lista);
  } catch (error) {
    console.error('Error GET /api/loma/garantias/[id]:', error);
    return NextResponse.json({ error: 'Error al obtener lista' }, { status: 500 });
  }
}

/** PUT - Actualizar lista de garantía */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const articulos = body.articulos;
    const articulosStr = typeof articulos === 'string' ? articulos : JSON.stringify(articulos ?? []);

    await prisma.lomaListaGarantia.update({
      where: { id },
      data: {
        nombreLista: body.nombreLista,
        articulos: articulosStr,
        personalId: body.personalId ?? null,
        fechaCreacion: body.fechaCreacion,
        fechaEnvio: body.fechaEnvio ?? null,
        estado: body.estado ?? 'En Preparación',
        notas: body.notas ?? null,
        trackingIda: body.trackingIda ?? null,
        trackingVenida: body.trackingVenida ?? null,
      },
    });

    broadcast({ type: 'invalidate', resource: 'garantias' });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error PUT /api/loma/garantias/[id]:', error);
    return NextResponse.json({ error: 'Error al actualizar lista' }, { status: 500 });
  }
}

/** DELETE - Eliminar lista de garantía */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.lomaListaGarantia.delete({ where: { id } });
    broadcast({ type: 'invalidate', resource: 'garantias' });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error DELETE /api/loma/garantias/[id]:', error);
    return NextResponse.json({ error: 'Error al eliminar lista' }, { status: 500 });
  }
}
