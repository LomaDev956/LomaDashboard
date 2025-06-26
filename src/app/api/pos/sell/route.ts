
import { NextResponse } from 'next/server';
import { getHerramientaById, updateHerramienta, type Herramienta } from '@/lib/herramientas-storage';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemIds } = body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ message: 'Se requiere un array de IDs de artículos.' }, { status: 400 });
    }

    const results = await Promise.all(itemIds.map(async (id: string) => {
      const tool = await getHerramientaById(id);

      if (!tool) {
        return { id, success: false, message: 'Herramienta no encontrada.' };
      }

      if (tool.estado !== 'Operativa') {
        return { id, success: false, message: `La herramienta no está operativa. Estado actual: ${tool.estado}.` };
      }

      const updatedTool: Herramienta = { ...tool, estado: 'Vendido' };
      const success = await updateHerramienta(updatedTool);

      if (success) {
        return { id, success: true, message: 'La herramienta ha sido marcada como vendida.' };
      } else {
        return { id, success: false, message: 'Error al actualizar la base de datos.' };
      }
    }));

    const allSucceeded = results.every(r => r.success);

    if (allSucceeded) {
      return NextResponse.json({ message: 'Venta registrada con éxito.', results }, { status: 200 });
    } else {
      // If some items failed, it's considered a partial success but the client should know which ones failed.
      return NextResponse.json({ message: 'Ocurrieron errores al procesar la venta de algunos artículos.', results }, { status: 207 }); // Multi-Status
    }

  } catch (error) {
    console.error('Error en el endpoint de venta:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
