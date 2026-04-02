import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { broadcast } from '@/lib/realtime-broadcast';

const prisma = new PrismaClient();

/** GET - Listar todo el personal LOMA */
export async function GET() {
  try {
    const rows = await prisma.lomaPersonal.findMany({
      orderBy: { apellido: 'asc' },
    });
    const personal = rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      apellido: r.apellido,
      email: r.email,
      direccion: r.direccion,
      ciudad: r.ciudad,
      estado: r.estado,
      codigoPostal: r.codigoPostal,
      telefono: r.telefono,
      status: r.status as 'Activo' | 'Inactivo',
      milwaukeeUser: r.milwaukeeUser,
      milwaukeePassword: r.milwaukeePassword,
    }));
    return NextResponse.json(personal);
  } catch (error) {
    console.error('Error GET /api/loma/personal:', error);
    return NextResponse.json({ error: 'Error al obtener personal' }, { status: 500 });
  }
}

/** POST - Crear personal */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      nombre,
      apellido,
      email,
      password,
      direccion,
      ciudad,
      estado,
      codigoPostal,
      telefono,
      status,
      milwaukeeUser,
      milwaukeePassword,
    } = body;

    if (!id || !nombre || !apellido || !email || !direccion || !ciudad || !estado || !codigoPostal || !telefono) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    try {
      await prisma.lomaPersonal.create({
        data: {
          id,
          nombre,
          apellido,
          email,
          passwordHash: password ? String(password) : null,
          direccion,
          ciudad,
          estado,
          codigoPostal,
          telefono,
          status: status ?? 'Activo',
          milwaukeeUser: milwaukeeUser ?? null,
          milwaukeePassword: milwaukeePassword ?? null,
        },
      });
    } catch (err) {
      // Errores de unicidad (email ya existe, id duplicado, etc.)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        console.error('Error POST /api/loma/personal - email o id duplicado:', err.meta);
        return NextResponse.json(
          { error: 'Ya existe un miembro del personal con ese email o identificador.' },
          { status: 409 },
        );
      }
      console.error('Error POST /api/loma/personal - Prisma error:', err);
      throw err;
    }

    broadcast({ type: 'invalidate', resource: 'personal' });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Error POST /api/loma/personal:', error);
    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : typeof error === 'string'
        ? error
        : 'Error desconocido';
    return NextResponse.json(
      { error: 'Error al crear personal', details: message },
      { status: 500 },
    );
  }
}
