import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

export type ExecFileSafeExtra = {
  env?: Record<string, string>;
  maxBuffer?: number;
  /** Use /dev/null for stdin (avoids dpkg-preconfigure "unable to re-open stdin" under PM2). */
  ignoreStdin?: boolean;
};

/**
 * Run a command with timeout and large buffer (for apt/ps output).
 * Pass `extra.env` to merge variables into process.env (e.g. DEBIAN_FRONTEND).
 */
export async function execFileSafe(
  file: string,
  args: string[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  extra?: ExecFileSafeExtra
): Promise<{ stdout: string; stderr: string }> {
  const maxBuffer = extra?.maxBuffer ?? DEFAULT_MAX_BUFFER;
  const env = extra?.env ? { ...process.env, ...extra.env } : process.env;
  const stdio = extra?.ignoreStdin
    ? (['ignore', 'pipe', 'pipe'] as const)
    : undefined;
  const result = await execFileAsync(file, args, {
    timeout: timeoutMs,
    maxBuffer,
    windowsHide: true,
    env,
    ...(stdio ? { stdio } : {}),
  });
  return {
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
  };
}

export function isUnixLike(): boolean {
  return process.platform !== 'win32';
}
