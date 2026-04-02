import { NextResponse } from 'next/server';
import { isLomaSessionAuthenticated } from '@/lib/loma-session';
import { getAptUpgrades } from '@/lib/server-health-data';

export async function GET() {
  if (!(await isLomaSessionAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const data = await getAptUpgrades();
  if (!data.ok && data.error) {
    return NextResponse.json(data, { status: 500 });
  }
  return NextResponse.json(data);
}
