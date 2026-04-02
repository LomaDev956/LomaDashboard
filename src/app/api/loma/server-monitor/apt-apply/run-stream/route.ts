import { NextResponse } from 'next/server';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { isLomaSessionAuthenticated } from '@/lib/loma-session';
import { isUnixLike } from '@/lib/server-health-exec';

const TAIL_MAX = 12_000;

function tailAppend(current: string, chunk: string, max: number = TAIL_MAX) {
  const next = (current ?? '') + chunk;
  if (next.length <= max) return next;
  return next.slice(-max);
}

function parseAptApplyFlag(): { ok: boolean } {
  const raw = process.env.LOMA_APT_APPLY_ENABLED;
  if (raw == null || String(raw).trim() === '') return { ok: false };
  const v = String(raw).trim().replace(/^["']|["']$/g, '').toLowerCase();
  return { ok: v === 'true' || v === '1' || v === 'yes' };
}

function parseIncludePhasedUpdates(): boolean {
  const raw = process.env.LOMA_APT_APPLY_INCLUDE_PHASED_UPDATES;
  if (raw == null || String(raw).trim() === '') return false;
  const v = String(raw).trim().replace(/^["']|["']$/g, '').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function sseEvent(event: string | undefined, data: unknown) {
  const json = JSON.stringify(data);
  return event ? `event: ${event}\ndata: ${json}\n\n` : `data: ${json}\n\n`;
}

export async function GET(req: Request) {
  if (!(await isLomaSessionAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!isUnixLike()) {
    return NextResponse.json({ error: 'Solo disponible en Linux' }, { status: 400 });
  }
  if (!parseAptApplyFlag().ok) {
    return NextResponse.json(
      {
        error:
          'Aplicar actualizaciones está deshabilitado. Define LOMA_APT_APPLY_ENABLED=true en el entorno del servidor.',
      },
      { status: 403 }
    );
  }

  const includePhased = parseIncludePhasedUpdates();

  const g = globalThis as any;
  const lockKey = '__loma_apt_apply_running__';
  const lock = g[lockKey] ?? { running: false, runId: 0 };
  g[lockKey] = lock;

  if (lock.running) {
    return NextResponse.json(
      { error: 'Apt apply ya está en ejecución' },
      { status: 423 }
    );
  }
  lock.running = true;
  lock.runId = (lock.runId ?? 0) + 1;
  const runId = lock.runId;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let done = false;
      const children: ChildProcessWithoutNullStreams[] = [];

      const push = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      const pushRaw = (text: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      };

      const cleanup = () => {
        if (done) return;
        done = true;
        try {
          lock.running = false;
        } catch {
          // ignore
        }
      };

      const abort = () => {
        cleanup();
        for (const c of children) {
          try {
            c.kill('SIGTERM');
          } catch {
            // ignore
          }
        }
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      req.signal.addEventListener('abort', abort);

      let updateStdout = '';
      let updateStderr = '';
      let upgradeStdout = '';
      let upgradeStderr = '';

      const runCmd = (label: 'update' | 'upgrade', command: string, args: string[]) =>
        new Promise<{ exitCode: number | null }>((resolve, reject) => {
          push('phase', {
            runId,
            phase: label,
            progress: label === 'update' ? 10 : 60,
            message: label === 'update' ? 'Ejecutando apt-get update...' : 'Ejecutando apt-get upgrade...',
          });

          const child = spawn(command, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env, DEBIAN_FRONTEND: 'noninteractive' },
          });
          children.push(child);

          const onStdout = (chunk: Buffer) => {
            const text = chunk.toString('utf8');
            if (label === 'update') updateStdout = tailAppend(updateStdout, text);
            else upgradeStdout = tailAppend(upgradeStdout, text);
            push(label === 'update' ? 'stdout' : 'stdout', { text });

            // Light heuristic for UI progress
            if (text.includes('Reading package lists')) {
              push('phase', { runId, phase: label, progress: label === 'update' ? 25 : 60, message: '' });
            }
            if (text.includes('Fetched') || text.includes('done')) {
              if (label === 'update') {
                push('phase', { runId, phase: label, progress: 40, message: '' });
              }
            }
            if (text.includes('Calculating upgrade')) {
              push('phase', { runId, phase: label, progress: 75, message: '' });
            }
          };

          const onStderr = (chunk: Buffer) => {
            const text = chunk.toString('utf8');
            if (label === 'update') updateStderr = tailAppend(updateStderr, text);
            else upgradeStderr = tailAppend(upgradeStderr, text);
            push('stderr', { text });
          };

          child.stdout.on('data', onStdout);
          child.stderr.on('data', onStderr);

          child.on('error', (err) => reject(err));
          child.on('close', (code) => {
            const exitCode = code ?? null;
            if (exitCode === 0) resolve({ exitCode });
            else reject(new Error(`${label} failed with exit code ${exitCode}`));
          });
        });

      const run = async () => {
        try {
          const sudoBase = ['-n'];
          // -o Dpkg::Progress-Fancy=0 helps keep output line-based in non-TTY environments.
          const commonDpkg = ['-o', 'Dpkg::Progress-Fancy=0', '-o', 'Dpkg::Use-Pty=0'];

          await runCmd(
            'update',
            'sudo',
            [
              ...sudoBase,
              'apt-get',
              'update',
              '-q',
              ...commonDpkg,
            ]
          );
          push('phase', { runId, phase: 'upgrade', progress: 60, message: 'Apt update listo. Ahora upgrade...' });

          await runCmd(
            'upgrade',
            'sudo',
            [
              ...sudoBase,
              'apt-get',
              'upgrade',
              '-y',
              '-q',
              ...(includePhased
                ? ['-o', 'APT::Get::Always-Include-Phased-Updates=true']
                : []),
              ...commonDpkg,
            ]
          );

          push('phase', { runId, phase: 'done', progress: 100, message: 'Finalizado' });
          push('done', {
            ok: true,
            update: { stdout: updateStdout, stderr: updateStderr },
            upgrade: { stdout: upgradeStdout, stderr: upgradeStderr },
          });
        } catch (e: unknown) {
          push('done', {
            ok: false,
            error: e instanceof Error ? e.message : String(e),
            update: { stdout: updateStdout, stderr: updateStderr },
            upgrade: { stdout: upgradeStdout, stderr: upgradeStderr },
          });
        } finally {
          cleanup();
          try {
            controller.close();
          } catch {
            // ignore
          }
        }
      };

      void run();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, must-revalidate',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

