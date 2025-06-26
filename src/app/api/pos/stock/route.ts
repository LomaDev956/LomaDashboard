
import { NextResponse } from 'next/server';
import { getHerramientasList } from '@/lib/herramientas-storage';

export async function GET(req: Request) {
  try {
    const allTools = await getHerramientasList();
    const stockItems = allTools.filter(tool => tool.estado === 'Operativa');
    
    return NextResponse.json(stockItems, { status: 200 });

  } catch (error) {
    console.error('Error en el endpoint de stock:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
