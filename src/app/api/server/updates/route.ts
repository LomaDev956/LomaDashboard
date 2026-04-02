import { NextRequest, NextResponse } from 'next/server';
import { serverHealthAuthError } from '@/lib/server-health-auth';
import { getAptUpgrades } from '@/lib/server-health-data';

export async function GET(request: NextRequest) {
  const authErr = serverHealthAuthError(request);
  if (authErr) return authErr;

  const data = await getAptUpgrades();
  if (!data.ok && data.error) {
    return NextResponse.json(data, { status: 500 });
  }
  return NextResponse.json(data);
}
