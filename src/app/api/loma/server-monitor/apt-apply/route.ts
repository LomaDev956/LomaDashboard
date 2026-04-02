import { NextResponse } from 'next/server';
import { isLomaSessionAuthenticated } from '@/lib/loma-session';
import { execFileSafe, execFileSafeEnv, isUnixLike } from '@/lib/server-health-exec';

function tail(s: string, max = 12_000): string {
  const t = String(s);
  if (t.length <= max) return t;
  return '…(truncado)\n' + t.slice(-max);
}

function parseAptApplyFlag(): { ok: boolean; status: 'on' | 'missing' | 'invalid' } {
  const raw = process.env.LOMA_APT_APPLY_ENABLED;
  if (raw == null || String(raw).trim() === '') {
    return { ok: false, status: 'missing' };
  }
  const v = String(raw)
    .trim()
    .replace(/^["']|["']$/g, '')
    .toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') {
    return { ok: true, status: 'on' };
  }
  return { ok: false, status: 'invalid' };
}

function aptApplyEnabled(): boolean {
  return parseAptApplyFlag().ok;
}

export async function GET() {
  if (!(await isLomaSessionAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const unix = isUnixLike();
  const { ok: flagOk, status: aptEnvStatus } = parseAptApplyFlag();
  const enabled = flagOk && unix;

  let hint = '';
  if (enabled) {
    hint =
      'El botón ejecutará apt-get update y upgrade. El usuario de Node necesita sudo NOPASSWD para apt-get.';
  } else if (!unix) {
    hint = 'Solo disponible en Linux.';
  } else if (aptEnvStatus === 'missing') {
    hint =
      'Next no ve LOMA_APT_APPLY_ENABLED: guarda .env.local en ~/loma-app, sin espacios raros al inicio de línea, luego pm2 restart loma-app --update-env. Comprueba con: grep LOMA_APT ~/loma-app/.env.local';
  } else {
    hint =
      'Valor no reconocido. Usa exactamente: LOMA_APT_APPLY_ENABLED=true (sin comillas o con comillas dobles). Luego pm2 restart loma-app.';
  }

  return NextResponse.json({
    enabled,
    unix,
    aptEnvStatus: unix ? aptEnvStatus : "not_linux",
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

  if (!aptApplyEnabled()) {
    return NextResponse.json(
      {
        error:
          'Aplicar actualizaciones está deshabilitado. Define LOMA_APT_APPLY_ENABLED=true en el entorno del servidor.',
      },
      { status: 403 }
    );
  }

  try {
    const updateOut = await execFileSafe(
      'sudo',
      ['-n', 'apt-get', 'update', '-qq'],
      300_000
    );

    const upgradeOut = await execFileSafeEnv(
      'sudo',
      ['-n', 'apt-get', 'upgrade', '-y', '-qq'],
      {
        timeoutMs: 900_000,
        env: { DEBIAN_FRONTEND: 'noninteractive' },
      }
    );

    return NextResponse.json({
      ok: true,
      update: {
        stdout: tail(updateOut.stdout),
        stderr: tail(updateOut.stderr),
      },
      upgrade: {
        stdout: tail(upgradeOut.stdout),
        stderr: tail(upgradeOut.stderr),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        error: msg,
        hint:
          'Si falla por contraseña, el usuario que ejecuta PM2/Node necesita entradas NOPASSWD para /usr/bin/apt-get (update y upgrade). Comprueba: sudo -n apt-get update',
      },
      { status: 500 }
    );
  }
}
