"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Pm2ProcSummary,
  ProcessRow,
  ServerHealthPayload,
} from "@/lib/server-health-types";

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}

function formatUptime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

const MONITOR = {
  health: "/api/loma/server-monitor/health",
  processes: "/api/loma/server-monitor/processes?limit=30",
  watchdog: "/api/loma/server-monitor/watchdog-log?lines=120",
  updates: "/api/loma/server-monitor/updates",
} as const;

export default function ServerHealthPage() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<ServerHealthPayload | null>(null);
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [procMeta, setProcMeta] = useState<{
    skipped?: boolean;
    skipReason?: string;
    error?: string;
  }>({});
  const [watchdogLines, setWatchdogLines] = useState<string[]>([]);
  const [watchdogPath, setWatchdogPath] = useState("");
  const [watchdogErr, setWatchdogErr] = useState<string | null>(null);
  const [updates, setUpdates] = useState<{
    ok: boolean;
    packages: string[];
    packageCount: number;
    skipped?: boolean;
    reason?: string;
    error?: string;
    truncated?: boolean;
  } | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchErr(null);
    setWatchdogErr(null);

    try {
      const [hRes, pRes, wRes, uRes] = await Promise.all([
        fetch(MONITOR.health, { credentials: "include" }),
        fetch(MONITOR.processes, { credentials: "include" }),
        fetch(MONITOR.watchdog, { credentials: "include" }),
        fetch(MONITOR.updates, { credentials: "include" }),
      ]);

      if (hRes.status === 401) {
        setFetchErr("Sesión expirada. Vuelve a entrar al panel.");
        setLoading(false);
        return;
      }

      if (!hRes.ok) {
        setFetchErr(`Salud: ${hRes.status}`);
        setLoading(false);
        return;
      }

      const hJson = (await hRes.json()) as ServerHealthPayload;
      setHealth(hJson);

      const pJson = (await pRes.json()) as {
        processes?: ProcessRow[];
        skipped?: boolean;
        skipReason?: string;
        error?: string;
      };
      if (!pRes.ok && !pJson.skipped) {
        setProcMeta({ error: pJson.error ?? `HTTP ${pRes.status}` });
        setProcesses([]);
      } else {
        setProcesses(pJson.processes ?? []);
        setProcMeta({
          skipped: pJson.skipped,
          skipReason: pJson.skipReason,
          error: pJson.error,
        });
      }

      const wJson = (await wRes.json()) as {
        lines?: string[];
        path?: string;
        skipped?: boolean;
        skipReason?: string;
        error?: string;
      };
      if (!wRes.ok && !wJson.skipped) {
        setWatchdogErr(wJson.error ?? `HTTP ${wRes.status}`);
        setWatchdogLines([]);
        setWatchdogPath(wJson.path ?? "");
      } else {
        setWatchdogLines(wJson.lines ?? []);
        setWatchdogPath(wJson.path ?? "");
        if (wJson.skipped && wJson.skipReason) {
          setWatchdogErr(wJson.skipReason);
        }
      }

      const uJson = (await uRes.json()) as {
        ok?: boolean;
        packages?: string[];
        packageCount?: number;
        skipped?: boolean;
        reason?: string;
        error?: string;
        truncated?: boolean;
      };
      if (!uRes.ok) {
        setUpdates({
          ok: false,
          packages: [],
          packageCount: 0,
          error: uJson.error ?? `HTTP ${uRes.status}`,
        });
      } else {
        setUpdates({
          ok: uJson.ok ?? true,
          packages: uJson.packages ?? [],
          packageCount: uJson.packageCount ?? 0,
          skipped: uJson.skipped,
          reason: uJson.reason,
          truncated: uJson.truncated,
        });
      }
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const memPct =
    health && health.memory.totalBytes > 0
      ? Math.round(
          (health.memory.usedBytes / health.memory.totalBytes) * 1000
        ) / 10
      : null;

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Salud del servidor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Métricas locales del proceso Node (misma máquina que corre esta
            app). Con sesión del panel; sin token en el navegador.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          className="border-cyan-500/30"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>

      {fetchErr && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="py-3">
            <CardTitle className="text-destructive text-base">{fetchErr}</CardTitle>
          </CardHeader>
        </Card>
      )}

      {health && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-cyan-500/20 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Host
              </CardTitle>
              <Activity className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold truncate" title={health.host.hostname}>
                {health.host.hostname}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {health.host.platform} · {health.host.arch}
              </p>
            </CardContent>
          </Card>

          <Card className="border-cyan-500/20 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Uptime
              </CardTitle>
              <Timer className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {formatUptime(health.host.uptimeSec)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Carga: {health.loadavg.map((x) => x.toFixed(2)).join(" · ")} ·{" "}
                {health.cpus} CPUs
              </p>
            </CardContent>
          </Card>

          <Card className="border-cyan-500/20 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Memoria
              </CardTitle>
              <MemoryStick className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {memPct != null ? `${memPct}%` : "—"} usado
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatBytes(health.memory.usedBytes)} /{" "}
                {formatBytes(health.memory.totalBytes)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-cyan-500/20 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Disco /
              </CardTitle>
              <HardDrive className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              {health.disk ? (
                <>
                  <p className="text-lg font-semibold">
                    {health.disk.usePercent != null
                      ? `${health.disk.usePercent}%`
                      : "—"}{" "}
                    usado
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Libre {formatBytes(health.disk.available1B)} ·{" "}
                    {health.disk.filesystem}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No disponible</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {health?.pm2 && (
        <Card className="border-cyan-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-cyan-400" />
              PM2
            </CardTitle>
            <CardDescription>
              {health.pm2.ok
                ? `${health.pm2.processes.length} procesos`
                : health.pm2.error ?? "PM2 no disponible"}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {health.pm2.processes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">PID</TableHead>
                    <TableHead className="text-right">CPU %</TableHead>
                    <TableHead className="text-right">RAM</TableHead>
                    <TableHead className="text-right">Reinicios</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {health.pm2.processes.map((p: Pm2ProcSummary) => (
                    <TableRow key={`${p.name}-${p.pid}`}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === "online" ? "default" : "secondary"
                          }
                          className={
                            p.status === "online"
                              ? "bg-emerald-600/80"
                              : undefined
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{p.pid}</TableCell>
                      <TableCell className="text-right">{p.cpu}</TableCell>
                      <TableCell className="text-right">
                        {formatBytes(p.memory)}
                      </TableCell>
                      <TableCell className="text-right">{p.restarts}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin datos de PM2 en esta máquina.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-cyan-500/20 bg-card/50">
        <CardHeader>
          <CardTitle>Procesos (top CPU)</CardTitle>
          <CardDescription>
            {procMeta.skipped
              ? procMeta.skipReason
              : procMeta.error ?? "Nombre corto (comm), ordenados por %CPU"}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {processes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="text-right">PID</TableHead>
                  <TableHead className="text-right">CPU%</TableHead>
                  <TableHead className="text-right">MEM%</TableHead>
                  <TableHead className="text-right">RSS</TableHead>
                  <TableHead>STAT</TableHead>
                  <TableHead>Tiempo</TableHead>
                  <TableHead>Comm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.map((p: ProcessRow) => (
                  <TableRow key={p.pid}>
                    <TableCell>{p.user}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {p.pid}
                    </TableCell>
                    <TableCell className="text-right">{p.pcpu}</TableCell>
                    <TableCell className="text-right">{p.pmem}</TableCell>
                    <TableCell className="text-right">
                      {formatBytes(p.rssKb * 1024)}
                    </TableCell>
                    <TableCell className="text-xs">{p.stat}</TableCell>
                    <TableCell className="text-xs">{p.etime}</TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs">
                      {p.command}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            !procMeta.skipped &&
            !procMeta.error && (
              <p className="text-sm text-muted-foreground">Sin filas.</p>
            )
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-cyan-500/20 bg-card/50">
          <CardHeader>
            <CardTitle>Log del miner-watchdog</CardTitle>
            <CardDescription className="font-mono text-xs break-all">
              {watchdogPath || "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {watchdogErr && !watchdogLines.length && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                {watchdogErr}
              </p>
            )}
            <pre className="max-h-80 overflow-auto rounded-md border border-cyan-500/20 bg-black/40 p-3 text-[11px] leading-relaxed text-gray-300">
              {watchdogLines.length
                ? watchdogLines.join("\n")
                : watchdogErr
                  ? ""
                  : "(vacío)"}
            </pre>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/20 bg-card/50">
          <CardHeader>
            <CardTitle>Actualizaciones apt</CardTitle>
            <CardDescription>
              Solo consulta; no instala paquetes desde aquí.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {updates?.error && (
              <p className="text-sm text-destructive mb-2">{updates.error}</p>
            )}
            {updates?.skipped && (
              <p className="text-sm text-muted-foreground mb-2">
                {updates.reason}
              </p>
            )}
            {updates && !updates.error && !updates.skipped && (
              <>
                <p className="text-sm mb-2">
                  <span className="font-semibold text-cyan-400">
                    {updates.packageCount}
                  </span>{" "}
                  paquetes actualizables
                  {updates.truncated ? " (lista truncada)" : ""}
                </p>
                <ul className="max-h-80 overflow-auto text-sm space-y-1 text-muted-foreground">
                  {updates.packages.map((pkg) => (
                    <li key={pkg} className="font-mono text-xs">
                      {pkg}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {health?.generatedAt && (
        <p className="text-xs text-muted-foreground text-center">
          Datos de salud: {new Date(health.generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
