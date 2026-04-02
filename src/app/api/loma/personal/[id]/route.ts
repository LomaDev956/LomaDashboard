import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { broadcast } from '@/lib/realtime-broadcast';

const prisma = new PrismaClient();

/** GET - Obtener personal por id */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const r = await prisma.lomaPersonal.findUnique({ where: { id } });
    if (!r) return NextResponse.json(null, { status: 404 });
    const personal = {
      id: r.id,
      nombre: r.nombre,
      apellido: r.apellido,
      email: r.email,
      direccion: r.direccion,
      ciudad: r.ciudad,
      estado: r.estado,
      codigoPostal: r.codigoPostal,
      telefono: r.telefono,
      status: r.status,
      milwaukeeUser: r.milwaukeeUser,
      milwaukeePassword: r.milwaukeePassword,
    };
    return NextResponse.json(personal);
  } catch (error) {
    console.error('Error GET /api/loma/personal/[id]:', error);
    return NextResponse.json({ error: 'Error al obtener personal' }, { status: 500 });
  }
}

/** PUT - Actualizar personal */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    await prisma.lomaPersonal.update({
      where: { id },
      data: {
        nombre: body.nombre,
        apellido: body.apellido,
        email: body.email,
        passwordHash: body.password !== undefined ? body.password : undefined,
        direccion: body.direccion,
        ciudad: body.ciudad,
        estado: body.estado,
        codigoPostal: body.codigoPostal,
        telefono: body.telefono,
        status: body.status ?? 'Activo',
        milwaukeeUser: body.milwaukeeUser ?? null,
        milwaukeePassword: body.milwaukeePassword ?? null,
      },
    });

    broadcast({ type: 'invalidate', resource: 'personal' });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error PUT /api/loma/personal/[id]:', error);
    return NextResponse.json({ error: 'Error al actualizar personal' }, { status: 500 });
  }
}

/** DELETE - Eliminar personal */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.lomaPersonal.delete({ where: { id } });
    broadcast({ type: 'invalidate', resource: 'personal' });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error DELETE /api/loma/personal/[id]:', error);
    return NextResponse.json({ error: 'Error al eliminar personal' }, { status: 500 });
  }
}
