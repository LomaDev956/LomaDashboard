import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { broadcast } from '@/lib/realtime-broadcast';

const prisma = new PrismaClient();

/** GET - Obtener una herramienta por id */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const r = await prisma.lomaHerramienta.findUnique({ where: { id } });
    if (!r) return NextResponse.json(null, { status: 404 });
    const herramienta = {
      id: r.id,
      catNo: r.catNo,
      toolName: r.toolName,
      serialNumber: r.serialNumber,
      precio: r.precio,
      falla: r.falla,
      anosGarantia: r.anosGarantia,
      fechaVencimientoGarantia: r.fechaVencimientoGarantia,
      fotos: typeof r.fotos === 'string' ? JSON.parse(r.fotos || '[]') : r.fotos,
      estado: r.estado,
      condicion: r.condicion,
      fechaAgregado: r.fechaAgregado,
      fechaVenta: r.fechaVenta,
    };
    return NextResponse.json(herramienta);
  } catch (error) {
    console.error('Error GET /api/loma/herramientas/[id]:', error);
    return NextResponse.json({ error: 'Error al obtener herramienta' }, { status: 500 });
  }
}

/** PUT - Actualizar herramienta */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const fotos = body.fotos;
    const fotosStr = typeof fotos === 'string' ? fotos : JSON.stringify(fotos ?? []);

    await prisma.lomaHerramienta.update({
      where: { id },
      data: {
        catNo: body.catNo,
        toolName: body.toolName,
        serialNumber: body.serialNumber ?? null,
        precio: body.precio ?? null,
        falla: body.falla ?? null,
        anosGarantia: body.anosGarantia ?? null,
        fechaVencimientoGarantia: body.fechaVencimientoGarantia ?? null,
        fotos: fotosStr,
        estado: body.estado ?? 'Operativa',
        condicion: body.condicion ?? 'Nueva',
        fechaAgregado: body.fechaAgregado,
        fechaVenta: body.fechaVenta ?? null,
      },
    });

    broadcast({ type: 'invalidate', resource: 'herramientas' });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error PUT /api/loma/herramientas/[id]:', error);
    return NextResponse.json({ error: 'Error al actualizar herramienta' }, { status: 500 });
  }
}

/** DELETE - Eliminar herramienta */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.lomaHerramienta.delete({ where: { id } });
    broadcast({ type: 'invalidate', resource: 'herramientas' });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error DELETE /api/loma/herramientas/[id]:', error);
    return NextResponse.json({ error: 'Error al eliminar herramienta' }, { status: 500 });
  }
}
