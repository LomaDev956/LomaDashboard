export type DiskRootInfo = {
  filesystem: string;
  blocks1B: number;
  used1B: number;
  available1B: number;
  usePercent: number | null;
  mountedOn: string;
};

export type Pm2ProcSummary = {
  name: string;
  status: string;
  pid: number;
  cpu: number;
  memory: number;
  restarts: number;
};

export type ServerHealthPayload = {
  generatedAt: string;
  host: {
    hostname: string;
    platform: string;
    release: string;
    arch: string;
    uptimeSec: number;
  };
  loadavg: number[];
  cpus: number;
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
  };
  disk: DiskRootInfo | null;
  pm2: {
    ok: boolean;
    processes: Pm2ProcSummary[];
    error?: string;
  };
};

export type ProcessRow = {
  user: string;
  pid: number;
  pcpu: number;
  pmem: number;
  rssKb: number;
  stat: string;
  etime: string;
  command: string;
};

export type ProcessesPayload = {
  generatedAt: string;
  limit: number;
  count: number;
  processes: ProcessRow[];
  skipped?: boolean;
  skipReason?: string;
  error?: string;
};

export type WatchdogLogPayload = {
  generatedAt: string;
  path: string;
  lineCount: number;
  lines: string[];
  skipped?: boolean;
  skipReason?: string;
  error?: string;
  hint?: string;
};

export type UpdatesPayload = {
  ok: boolean;
  generatedAt?: string;
  skipped?: boolean;
  reason?: string;
  packageCount: number;
  packages: string[];
  truncated?: boolean;
  error?: string;
  hint?: string;
};
