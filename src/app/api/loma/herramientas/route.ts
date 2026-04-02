import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { broadcast } from '@/lib/realtime-broadcast';

const prisma = new PrismaClient();

/** GET - Listar todas las herramientas LOMA */
export async function GET(request: NextRequest) {
  try {
    // Por defecto NO incluir fotos para optimizar velocidad (solo incluir cuando se necesite)
    const searchParams = request.nextUrl.searchParams;
    const includePhotos = searchParams.get('includePhotos') === 'true';
    
    const rows = await prisma.lomaHerramienta.findMany({
      orderBy: { fechaAgregado: 'desc' },
    });
    
    const herramientas = rows.map((r) => {
      const base = {
        id: r.id,
        catNo: r.catNo,
        toolName: r.toolName,
        serialNumber: r.serialNumber,
        precio: r.precio,
        falla: r.falla,
        anosGarantia: r.anosGarantia,
        fechaVencimientoGarantia: r.fechaVencimientoGarantia,
        estado: r.estado as 'Operativa' | 'Requiere Reparación' | 'Vendido',
        condicion: r.condicion as 'Nueva' | 'Usada' | 'Usada (Reparada)',
        fechaAgregado: r.fechaAgregado,
        fechaVenta: r.fechaVenta,
      };
      
      // Solo incluir fotos si se solicita explícitamente
      if (includePhotos) {
        return {
          ...base,
          fotos: typeof r.fotos === 'string' ? JSON.parse(r.fotos || '[]') : r.fotos,
        };
      } else {
        // Devolver array vacío para mantener compatibilidad con el tipo
        return {
          ...base,
          fotos: [],
        };
      }
    });
    
    return NextResponse.json(herramientas);
  } catch (error) {
    console.error('Error GET /api/loma/herramientas:', error);
    return NextResponse.json({ error: 'Error al obtener herramientas' }, { status: 500 });
  }
}

/** POST - Crear herramienta LOMA */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      catNo,
      toolName,
      serialNumber,
      precio,
      falla,
      anosGarantia,
      fechaVencimientoGarantia,
      fotos,
      estado,
      condicion,
      fechaAgregado,
      fechaVenta,
    } = body;

    if (!id || !catNo || !toolName || !fechaAgregado) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: id, catNo, toolName, fechaAgregado' },
        { status: 400 }
      );
    }

    const fotosStr = typeof fotos === 'string' ? fotos : JSON.stringify(fotos || []);

    await prisma.lomaHerramienta.create({
      data: {
        id,
        catNo,
        toolName,
        serialNumber: serialNumber ?? null,
        precio: precio ?? null,
        falla: falla ?? null,
        anosGarantia: anosGarantia ?? null,
        fechaVencimientoGarantia: fechaVencimientoGarantia ?? null,
        fotos: fotosStr,
        estado: estado ?? 'Operativa',
        condicion: condicion ?? 'Nueva',
        fechaAgregado,
        fechaVenta: fechaVenta ?? null,
      },
    });

    broadcast({ type: 'invalidate', resource: 'herramientas' });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Error POST /api/loma/herramientas:', error);
    return NextResponse.json({ error: 'Error al crear herramienta' }, { status: 500 });
  }
}
