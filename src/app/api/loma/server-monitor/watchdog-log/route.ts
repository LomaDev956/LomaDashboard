import { NextRequest, NextResponse } from 'next/server';
import { isLomaSessionAuthenticated } from '@/lib/loma-session';
import {
  clampWatchdogLines,
  getWatchdogLogLines,
} from '@/lib/server-health-data';

export async function GET(request: NextRequest) {
  if (!(await isLomaSessionAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const n = clampWatchdogLines(searchParams.get('lines'));
  const data = await getWatchdogLogLines(n);

  if (data.skipped) {
    return NextResponse.json(data, { status: 200 });
  }
  if (data.error) {
    return NextResponse.json(data, { status: 500 });
  }
  return NextResponse.json(data);
}
