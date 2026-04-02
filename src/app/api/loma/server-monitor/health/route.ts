import { NextResponse } from 'next/server';
import { isLomaSessionAuthenticated } from '@/lib/loma-session';
import { getServerHealthSnapshot } from '@/lib/server-health-data';

export async function GET() {
  if (!(await isLomaSessionAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const data = await getServerHealthSnapshot();
  return NextResponse.json(data);
}
