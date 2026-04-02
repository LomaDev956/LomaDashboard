import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { isLomaSessionAuthenticated } from '@/lib/loma-session';
import { isUnixLike } from '@/lib/server-health-exec';

function parseRebootFlag(): boolean {
  const raw = process.env.LOMA_REBOOT_ENABLED;
  if (raw == null || String(raw).trim() === '') return false;
  const v = String(raw).trim().replace(/^["']|["']$/g, '').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function rebootRequired(): boolean {
  // Ubuntu/Debian usually creates this file when a reboot is recommended.
  return (
    existsSync('/var/run/reboot-required') || existsSync('/run/reboot-required')
  );
}

export async function GET() {
  if (!(await isLomaSessionAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const unix = isUnixLike();
  const enabled = unix && parseRebootFlag();
  const required = rebootRequired();

  const hint = enabled
    ? required
      ? 'Reinicio recomendado: el sistema marca /var/run/reboot-required.'
      : 'No se requiere reiniciar ahora.'
    : 'Reiniciar deshabilitado. En el servidor pon LOMA_REBOOT_ENABLED=true y añade sudo NOPASSWD para reboot/shutdown.';

  return NextResponse.json({
    enabled,
    unix,
    rebootRequired: required,
    hint,
  });
}

export async function POST() {
  if (!(await isLomaSessionAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!isUnixLike()) {
    return NextResponse.json({ error: 'Solo disponible en Linux' }, { status: 400 });
  }

  if (!parseRebootFlag()) {
    return NextResponse.json(
      { error: 'Reiniciar deshabilitado (LOMA_REBOOT_ENABLED=false)' },
      { status: 403 }
    );
  }

  const required = rebootRequired();

  // Lanzamos y devolvemos. El reinicio mata el proceso/connection.
  try {
    const child = spawn(
      'sudo',
      ['-n', 'shutdown', '-r', 'now'],
      { stdio: 'ignore', detached: true }
    );
    child.unref();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    started: true,
    rebootRequired: required,
  });
}

