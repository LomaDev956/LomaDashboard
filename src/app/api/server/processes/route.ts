import { NextRequest, NextResponse } from 'next/server';
import { serverHealthAuthError } from '@/lib/server-health-auth';
import {
  clampProcessLimit,
  getServerProcesses,
} from '@/lib/server-health-data';

export async function GET(request: NextRequest) {
  const authErr = serverHealthAuthError(request);
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const limit = clampProcessLimit(searchParams.get('limit'));
  const data = await getServerProcesses(limit);

  if (data.skipped) {
    return NextResponse.json(
      {
        error: data.skipReason,
        processes: [],
        limit: data.limit,
        generatedAt: data.generatedAt,
      },
      { status: 200 }
    );
  }
  if (data.error) {
    return NextResponse.json(data, { status: 500 });
  }
  return NextResponse.json(data);
}
