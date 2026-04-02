import { NextRequest, NextResponse } from 'next/server';
import { isLomaSessionAuthenticated } from '@/lib/loma-session';
import {
  clampProcessLimit,
  getServerProcesses,
} from '@/lib/server-health-data';

export async function GET(request: NextRequest) {
  if (!(await isLomaSessionAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = clampProcessLimit(searchParams.get('limit'));
  const data = await getServerProcesses(limit);

  if (data.skipped) {
    return NextResponse.json(data, { status: 200 });
  }
  if (data.error) {
    return NextResponse.json(data, { status: 500 });
  }
  return NextResponse.json(data);
}
