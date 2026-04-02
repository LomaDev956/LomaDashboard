import { NextRequest, NextResponse } from 'next/server';
import { serverHealthAuthError } from '@/lib/server-health-auth';
import {
  clampWatchdogLines,
  getWatchdogLogLines,
} from '@/lib/server-health-data';

export async function GET(request: NextRequest) {
  const authErr = serverHealthAuthError(request);
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const n = clampWatchdogLines(searchParams.get('lines'));
  const data = await getWatchdogLogLines(n);

  if (data.skipped) {
    return NextResponse.json(
      {
        error: data.skipReason,
        path: data.path,
        lines: [],
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
