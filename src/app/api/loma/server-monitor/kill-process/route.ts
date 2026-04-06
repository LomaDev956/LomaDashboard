import { NextRequest, NextResponse } from 'next/server';
import { isLomaSessionAuthenticated } from '@/lib/loma-session';
import {
  isKillProcessFeatureEnabled,
  isKillProcessSigkillAllowed,
  killServerProcess,
} from '@/lib/server-health-data';

export async function GET() {
  if (!(await isLomaSessionAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const enabled = isKillProcessFeatureEnabled();
  const allowSigkill = isKillProcessSigkillAllowed();

  const hint = enabled
    ? allowSigkill
      ? 'Terminar y Forzar (-9) están habilitados. Usa con cuidado.'
      : 'Sólo señal TERM (cierre ordenado). Para SIGKILL define LOMA_KILL_PROCESS_ALLOW_SIGKILL=true.'
    : 'Matar procesos deshabilitado. En el servidor: LOMA_KILL_PROCESS_ENABLED=true y sudo NOPASSWD para /bin/kill y /usr/bin/kill si hace falta matar procesos de otro usuario.';

  return NextResponse.json({
    enabled,
    allowSigkill,
    hint,
  });
}

export async function POST(request: NextRequest) {
  if (!(await isLomaSessionAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!isKillProcessFeatureEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Matar procesos deshabilitado (LOMA_KILL_PROCESS_ENABLED=false)',
      },
      { status: 403 }
    );
  }

  let body: { pid?: unknown; force?: unknown };
  try {
    body = (await request.json()) as { pid?: unknown; force?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const pid =
    typeof body.pid === 'number'
      ? body.pid
      : typeof body.pid === 'string'
        ? parseInt(body.pid, 10)
        : NaN;

  const force = body.force === true;

  if (force && !isKillProcessSigkillAllowed()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'SIGKILL deshabilitado (LOMA_KILL_PROCESS_ALLOW_SIGKILL no está en true)',
      },
      { status: 403 }
    );
  }

  const result = await killServerProcess(pid, force);
  if (result.ok) {
    return NextResponse.json(result);
  }

  const status =
    result.error?.includes('inválido') || result.error?.includes('portal')
      ? 400
      : 500;

  return NextResponse.json(result, { status });
}
