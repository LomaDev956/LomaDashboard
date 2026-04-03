import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { isLomaSessionAuthenticated } from '@/lib/loma-session';
import { execFileSafe, isUnixLike } from '@/lib/server-health-exec';

function parseRebootFlag(): boolean {
  const raw = process.env.LOMA_REBOOT_ENABLED;
  if (raw == null || String(raw).trim() === '') return false;
  const v = String(raw).trim().replace(/^["']|["']$/g, '').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function rebootRequired(): boolean {
  return (
    existsSync('/var/run/reboot-required') || existsSync('/run/reboot-required')
  );
}

function execFailureDetail(e: unknown): string {
  if (e && typeof e === 'object') {
    const o = e as { stderr?: Buffer | string; message?: string };
    const s = o.stderr != null ? String(o.stderr).trim() : '';
    if (s) return s;
    if (o.message) return o.message;
  }
  return e instanceof Error ? e.message : String(e);
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
    : 'Reiniciar deshabilitado. En el servidor pon LOMA_REBOOT_ENABLED=true y añade sudo NOPASSWD para /usr/sbin/shutdown (o /sbin/shutdown).';

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

  try {
    await execFileSafe('sudo', ['-n', 'true'], 5000, { ignoreStdin: true });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'sudo sin contraseña no funciona para el usuario de Node/PM2 (sudo -n true falló).',
        detail: execFailureDetail(e),
        hint:
          'En el servidor: sudo visudo y añade una línea NOPASSWD para ese usuario, por ejemplo: lomadev ALL=(ALL) NOPASSWD: /usr/sbin/shutdown',
      },
      { status: 500 }
    );
  }

  const shutdownBins = ['/usr/sbin/shutdown', '/sbin/shutdown'];
  let lastDetail = '';

  for (const bin of shutdownBins) {
    try {
      await execFileSafe('sudo', ['-n', bin, '-r', 'now'], 15_000, {
        ignoreStdin: true,
      });
      return NextResponse.json({
        ok: true,
        started: true,
        shutdownPath: bin,
        rebootRequired: required,
      });
    } catch (e) {
      lastDetail = execFailureDetail(e);
      if (/ENOENT|not found/i.test(lastDetail)) continue;
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'No se pudo ejecutar shutdown -r now con sudo -n.',
      detail: lastDetail,
      hint:
        'Comprueba la ruta con `which shutdown` y añade en sudoers exactamente esa ruta con NOPASSWD.',
    },
    { status: 500 }
  );
}
