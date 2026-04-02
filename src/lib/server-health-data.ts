import os from 'os';
import { execFileSafe, isUnixLike } from '@/lib/server-health-exec';
import type {
  DiskRootInfo,
  ProcessRow,
  ProcessesPayload,
  ServerHealthPayload,
  UpdatesPayload,
  WatchdogLogPayload,
} from '@/lib/server-health-types';

export type {
  DiskRootInfo,
  Pm2ProcSummary,
  ProcessRow,
  ProcessesPayload,
  ServerHealthPayload,
  UpdatesPayload,
  WatchdogLogPayload,
} from '@/lib/server-health-types';

function parseDfOutput(line: string): DiskRootInfo | null {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 6) return null;
  const [filesystem, blocks, used, avail, pct, ...rest] = parts;
  const mountedOn = rest.join(' ') || '/';
  const usePercent = pct?.endsWith('%')
    ? parseInt(pct.slice(0, -1), 10)
    : null;
  return {
    filesystem,
    blocks1B: Number(blocks) || 0,
    used1B: Number(used) || 0,
    available1B: Number(avail) || 0,
    usePercent: Number.isFinite(usePercent) ? usePercent : null,
    mountedOn,
  };
}

export async function getServerHealthSnapshot(): Promise<ServerHealthPayload> {
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  let diskRoot: DiskRootInfo | null = null;

  if (isUnixLike()) {
    try {
      const { stdout } = await execFileSafe('df', ['-B1', '/']);
      const lines = stdout.trim().split('\n').filter(Boolean);
      if (lines.length >= 2) {
        diskRoot = parseDfOutput(lines[1] ?? '');
      }
    } catch {
      diskRoot = null;
    }
  }

  let pm2Summary: ServerHealthPayload['pm2'] = {
    ok: false,
    processes: [],
  };

  if (isUnixLike()) {
    try {
      const { stdout } = await execFileSafe('pm2', ['jlist'], 8_000);
      const processes = JSON.parse(stdout) as unknown[];
      pm2Summary = {
        ok: true,
        processes: Array.isArray(processes)
          ? processes.map((proc: any) => ({
              name: proc.name,
              status: proc.pm2_env?.status ?? 'unknown',
              pid: proc.pid,
              cpu: proc.monit?.cpu ?? 0,
              memory: proc.monit?.memory ?? 0,
              restarts: proc.pm2_env?.restart_time ?? 0,
            }))
          : [],
      };
    } catch (e) {
      pm2Summary = {
        ok: false,
        processes: [],
        error: e instanceof Error ? e.message : 'pm2 no disponible',
      };
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    host: {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      uptimeSec: Math.floor(os.uptime()),
    },
    loadavg: os.loadavg(),
    cpus: os.cpus()?.length ?? 0,
    memory: {
      totalBytes: memTotal,
      freeBytes: memFree,
      usedBytes: memTotal - memFree,
    },
    disk: diskRoot,
    pm2: pm2Summary,
  };
}

const DEFAULT_PROC_LIMIT = 25;
const MAX_PROC_LIMIT = 60;

function parsePsLines(stdout: string, limit: number): ProcessRow[] {
  const lines = stdout.trim().split('\n');
  const rows: ProcessRow[] = [];

  for (const line of lines) {
    if (rows.length >= limit) break;
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 8) continue;

    const user = parts[0] ?? '';
    const pid = parseInt(parts[1] ?? '', 10);
    const pcpu = parseFloat(parts[2] ?? '');
    const pmem = parseFloat(parts[3] ?? '');
    const rssKb = parseInt(parts[4] ?? '', 10);
    const stat = parts[5] ?? '';
    const etime = parts[6] ?? '';
    const command = parts.slice(7).join(' ').trim();

    if (!Number.isFinite(pid) || !Number.isFinite(pcpu)) continue;

    rows.push({
      user,
      pid,
      pcpu,
      pmem,
      rssKb: Number.isFinite(rssKb) ? rssKb : 0,
      stat,
      etime,
      command,
    });
  }
  return rows;
}

export function clampProcessLimit(raw: string | null): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return DEFAULT_PROC_LIMIT;
  return Math.min(Math.max(1, n), MAX_PROC_LIMIT);
}

export async function getServerProcesses(
  limit: number
): Promise<ProcessesPayload> {
  if (!isUnixLike()) {
    return {
      generatedAt: new Date().toISOString(),
      limit,
      count: 0,
      processes: [],
      skipped: true,
      skipReason:
        'Listado de procesos sólo disponible en el servidor Linux (no en Windows dev).',
    };
  }

  try {
    const { stdout, stderr } = await execFileSafe('ps', [
      '-eo',
      'user,pid,pcpu,pmem,rss,stat,etime,comm',
      '--sort=-pcpu',
      '--no-headers',
    ]);

    if (stderr.trim()) {
      console.warn('[processes] ps stderr:', stderr.slice(0, 500));
    }

    const processes = parsePsLines(stdout, limit);

    return {
      generatedAt: new Date().toISOString(),
      limit,
      count: processes.length,
      processes,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error ejecutando ps';
    return {
      generatedAt: new Date().toISOString(),
      limit,
      count: 0,
      processes: [],
      error: message,
    };
  }
}

export function getWatchdogLogFilePath(): string {
  return (
    process.env.SERVER_WATCHDOG_LOG_PATH ||
    '/var/log/loma-security/miner-watchdog.log'
  );
}

const DEFAULT_LOG_LINES = 100;
const MAX_LOG_LINES = 500;

export function clampWatchdogLines(raw: string | null): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return DEFAULT_LOG_LINES;
  return Math.min(Math.max(1, n), MAX_LOG_LINES);
}

export async function getWatchdogLogLines(n: number): Promise<WatchdogLogPayload> {
  const path = getWatchdogLogFilePath();

  if (!isUnixLike()) {
    return {
      generatedAt: new Date().toISOString(),
      path,
      lineCount: 0,
      lines: [],
      skipped: true,
      skipReason: 'Log del watchdog sólo en servidor Linux.',
    };
  }

  try {
    const { stdout } = await execFileSafe('tail', ['-n', String(n), path]);
    const lines = stdout.replace(/\n$/, '').split('\n');
    return {
      generatedAt: new Date().toISOString(),
      path,
      lineCount: lines.filter((l) => l.length > 0).length,
      lines,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'No se pudo leer el log';
    return {
      generatedAt: new Date().toISOString(),
      path,
      lineCount: 0,
      lines: [],
      error: message,
      hint:
        'Revisa permisos (el usuario de Node suele necesitar lectura del log o sudo configurado).',
    };
  }
}

export async function getAptUpgrades(): Promise<UpdatesPayload> {
  if (!isUnixLike()) {
    return {
      ok: true,
      skipped: true,
      reason: 'No aplica fuera de Linux (desarrollo local Windows).',
      packageCount: 0,
      packages: [],
    };
  }

  try {
    const { stdout, stderr } = await execFileSafe(
      'apt',
      ['list', '--upgradable'],
      45_000
    );

    const raw = `${stdout}\n${stderr}`;
    const packages: string[] = [];
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('Listing')) continue;
      if (/\[upgradable from:/i.test(t)) {
        const name = t.split('/')[0]?.trim();
        if (name) packages.push(name);
      }
    }

    const unique = [...new Set(packages)];

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      packageCount: unique.length,
      packages: unique.slice(0, 200),
      truncated: unique.length > 200,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Error ejecutando apt list';
    return {
      ok: false,
      error: message,
      hint:
        'En algunos servidores hace falta `sudo` o actualizar caché (`sudo apt update`).',
      packageCount: 0,
      packages: [],
    };
  }
}
