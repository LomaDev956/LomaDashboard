import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { broadcast } from '@/lib/realtime-broadcast';

const prisma = new PrismaClient();

/** Formato del backup exportado por la app (herramientas, garantías, personal) */
interface BackupPayload {
  version?: string;
  timestamp?: string;
  herramientas: Array<{
    id: string;
    catNo: string;
    toolName: string;
    serialNumber?: string | null;
    precio?: number | null;
    falla?: string | null;
    anosGarantia?: number | null;
    fechaVencimientoGarantia?: string | null;
    fotos?: unknown[] | string;
    estado?: string;
    condicion?: string;
    fechaAgregado: string;
    fechaVenta?: string | null;
  }>;
  garantias: Array<{
    id: string;
    nombreLista: string;
    articulos?: unknown[] | string;
    personalId?: string | null;
    fechaCreacion: string;
    fechaEnvio?: string | null;
    estado?: string;
    notas?: string | null;
    trackingIda?: string | null;
    trackingVenida?: string | null;
  }>;
  personal: Array<{
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    password?: string;
    direccion: string;
    ciudad: string;
    estado: string;
    codigoPostal: string;
    telefono: string;
    status?: string;
    milwaukeeUser?: string | null;
    milwaukeePassword?: string | null;
  }>;
}

/**
 * POST /api/loma/import
 * Importa un backup JSON al servidor (base de datos).
 * Reemplaza los datos existentes. Así los datos se ven en todos los dispositivos.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BackupPayload;
    const { herramientas = [], garantias = [], personal = [] } = body;

    if (!Array.isArray(herramientas) || !Array.isArray(garantias) || !Array.isArray(personal)) {
      return NextResponse.json(
        { error: 'Formato inválido: se requieren arrays herramientas, garantias y personal' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.lomaHerramienta.deleteMany();
      await tx.lomaListaGarantia.deleteMany();
      await tx.lomaPersonal.deleteMany();

      if (herramientas.length > 0) {
        const fotosStr = (fotos: unknown[] | string) =>
          typeof fotos === 'string' ? fotos : JSON.stringify(fotos || []);
        await tx.lomaHerramienta.createMany({
          data: herramientas.map((h) => ({
            id: h.id,
            catNo: h.catNo,
            toolName: h.toolName,
            serialNumber: h.serialNumber ?? null,
            precio: h.precio ?? null,
            falla: h.falla ?? null,
            anosGarantia: h.anosGarantia ?? null,
            fechaVencimientoGarantia: h.fechaVencimientoGarantia ?? null,
            fotos: fotosStr(h.fotos ?? []),
            estado: h.estado ?? 'Operativa',
            condicion: h.condicion ?? 'Nueva',
            fechaAgregado: h.fechaAgregado,
            fechaVenta: h.fechaVenta ?? null,
          })),
        });
      }

      if (garantias.length > 0) {
        const articulosStr = (a: unknown[] | string) =>
          typeof a === 'string' ? a : JSON.stringify(a ?? []);
        await tx.lomaListaGarantia.createMany({
          data: garantias.map((g) => ({
            id: g.id,
            nombreLista: g.nombreLista,
            articulos: articulosStr(g.articulos ?? []),
            personalId: g.personalId ?? null,
            fechaCreacion: g.fechaCreacion,
            fechaEnvio: g.fechaEnvio ?? null,
            estado: g.estado ?? 'En Preparación',
            notas: g.notas ?? null,
            trackingIda: g.trackingIda ?? null,
            trackingVenida: g.trackingVenida ?? null,
          })),
        });
      }

      if (personal.length > 0) {
        await tx.lomaPersonal.createMany({
          data: personal.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            apellido: p.apellido,
            email: p.email,
            passwordHash: p.password ? String(p.password) : null,
            direccion: p.direccion,
            ciudad: p.ciudad,
            estado: p.estado,
            codigoPostal: p.codigoPostal,
            telefono: p.telefono,
            status: (p.status ?? 'Activo') as 'Activo' | 'Inactivo',
            milwaukeeUser: p.milwaukeeUser ?? null,
            milwaukeePassword: p.milwaukeePassword ?? null,
          })),
        });
      }
    });

    broadcast({ type: 'invalidate', resource: 'herramientas' });
    broadcast({ type: 'invalidate', resource: 'garantias' });
    broadcast({ type: 'invalidate', resource: 'personal' });

    return NextResponse.json({
      ok: true,
      message: 'Importación completada. Los datos se verán en todos los dispositivos.',
      counts: { herramientas: herramientas.length, garantias: garantias.length, personal: personal.length },
    });
  } catch (error) {
    console.error('Error POST /api/loma/import:', error);
    return NextResponse.json(
      { error: 'Error al importar datos en el servidor' },
      { status: 500 }
    );
  }
}
