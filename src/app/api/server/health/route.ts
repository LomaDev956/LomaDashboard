import { NextRequest, NextResponse } from 'next/server';
import { serverHealthAuthError } from '@/lib/server-health-auth';
import { getServerHealthSnapshot } from '@/lib/server-health-data';

export async function GET(request: NextRequest) {
  const authErr = serverHealthAuthError(request);
  if (authErr) return authErr;

  const data = await getServerHealthSnapshot();
  return NextResponse.json(data);
}
