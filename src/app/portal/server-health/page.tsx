"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Cpu,
  Download,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  aptApply: "/api/loma/server-monitor/apt-apply",
} as const;

export default function PortalServerHealthPage() {
  const router = useRouter();
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
  const [aptApplyEnabled, setAptApplyEnabled] = useState<boolean | null>(null);
  const [aptApplyHint, setAptApplyHint] = useState("");
  const [aptDialogOpen, setAptDialogOpen] = useState(false);
  const [aptApplying, setAptApplying] = useState(false);
  const [aptApplyLog, setAptApplyLog] = useState<string | null>(null);

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
        setFetchErr("Sesión expirada. Vuelve a entrar al portal.");
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(MONITOR.aptApply, { credentials: "include" });
        const j = (await res.json()) as { enabled?: boolean; hint?: string };
        if (!cancelled) {
          setAptApplyEnabled(!!j.enabled);
          setAptApplyHint(typeof j.hint === "string" ? j.hint : "");
        }
      } catch {
        if (!cancelled) {
          setAptApplyEnabled(false);
          setAptApplyHint("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runAptApply = useCallback(async () => {
    setAptApplying(true);
    setAptApplyLog(null);
    try {
      const res = await fetch(MONITOR.aptApply, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        hint?: string;
        update?: { stdout: string; stderr: string };
        upgrade?: { stdout: string; stderr: string };
      };
      if (!res.ok) {
        setAptApplyLog(
          [j.error, j.hint].filter(Boolean).join("\n\n") || `HTTP ${res.status}`
        );
        return;
      }
      setAptApplyLog(
        JSON.stringify(
          {
            ok: j.ok,
            update: j.update,
            upgrade: j.upgrade,
          },
          null,
          2
        )
      );
      await load();
    } catch (e) {
      setAptApplyLog(e instanceof Error ? e.message : "Error de red");
    } finally {
      setAptApplying(false);
      setAptDialogOpen(false);
    }
  }, [load]);

  const memPct =
    health && health.memory.totalBytes > 0
      ? Math.round(
          (health.memory.usedBytes / health.memory.totalBytes) * 1000
        ) / 10
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-gray-100">
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => router.push("/portal")}
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Portal
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Salud del servidor
              </h1>
              <p className="text-sm text-gray-400 mt-1 max-w-xl">
                Portal LomaDev: métricas del mismo equipo donde corre esta
                aplicación (sesión del portal; sin token en el navegador).
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="border-cyan-500/30 text-cyan-400 shrink-0"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>

        {fetchErr && (
          <Card className="border-destructive/50 bg-destructive/10 border-2">
            <CardHeader className="py-3">
              <CardTitle className="text-destructive text-base">
                {fetchErr}
              </CardTitle>
            </CardHeader>
          </Card>
        )}

        {health && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-black/50 border-2 border-cyan-500/20 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Host
                </CardTitle>
                <Activity className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <p
                  className="text-lg font-semibold truncate text-white"
                  title={health.host.hostname}
                >
                  {health.host.hostname}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {health.host.platform} · {health.host.arch}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/50 border-2 border-cyan-500/20 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Uptime
                </CardTitle>
                <Timer className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-white">
                  {formatUptime(health.host.uptimeSec)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Carga: {health.loadavg.map((x) => x.toFixed(2)).join(" · ")}{" "}
                  · {health.cpus} CPUs
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/50 border-2 border-cyan-500/20 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Memoria
                </CardTitle>
                <MemoryStick className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-white">
                  {memPct != null ? `${memPct}%` : "—"} usado
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatBytes(health.memory.usedBytes)} /{" "}
                  {formatBytes(health.memory.totalBytes)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/50 border-2 border-cyan-500/20 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Disco /
                </CardTitle>
                <HardDrive className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                {health.disk ? (
                  <>
                    <p className="text-lg font-semibold text-white">
                      {health.disk.usePercent != null
                        ? `${health.disk.usePercent}%`
                        : "—"}{" "}
                      usado
                    </p>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      Libre {formatBytes(health.disk.available1B)} ·{" "}
                      {health.disk.filesystem}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No disponible</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {health?.pm2 && (
          <Card className="bg-black/50 border-2 border-cyan-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Cpu className="h-5 w-5 text-cyan-400" />
                PM2
              </CardTitle>
              <CardDescription className="text-gray-400">
                {health.pm2.ok
                  ? `${health.pm2.processes.length} procesos`
                  : health.pm2.error ?? "PM2 no disponible"}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {health.pm2.processes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-cyan-500/20">
                      <TableHead className="text-gray-300">Nombre</TableHead>
                      <TableHead className="text-gray-300">Estado</TableHead>
                      <TableHead className="text-right text-gray-300">
                        PID
                      </TableHead>
                      <TableHead className="text-right text-gray-300">
                        CPU %
                      </TableHead>
                      <TableHead className="text-right text-gray-300">
                        RAM
                      </TableHead>
                      <TableHead className="text-right text-gray-300">
                        Reinicios
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {health.pm2.processes.map((p: Pm2ProcSummary) => (
                      <TableRow
                        key={`${p.name}-${p.pid}`}
                        className="border-cyan-500/10"
                      >
                        <TableCell className="font-medium text-white">
                          {p.name}
                        </TableCell>
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
                        <TableCell className="text-right text-gray-200">
                          {p.pid}
                        </TableCell>
                        <TableCell className="text-right text-gray-200">
                          {p.cpu}
                        </TableCell>
                        <TableCell className="text-right text-gray-200">
                          {formatBytes(p.memory)}
                        </TableCell>
                        <TableCell className="text-right text-gray-200">
                          {p.restarts}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-gray-400">
                  Sin datos de PM2 en esta máquina.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="bg-black/50 border-2 border-cyan-500/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Procesos (top CPU)</CardTitle>
            <CardDescription className="text-gray-400">
              {procMeta.skipped
                ? procMeta.skipReason
                : procMeta.error ?? "Nombre corto (comm), ordenados por %CPU"}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {processes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-cyan-500/20">
                    <TableHead className="text-gray-300">Usuario</TableHead>
                    <TableHead className="text-right text-gray-300">
                      PID
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      CPU%
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      MEM%
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      RSS
                    </TableHead>
                    <TableHead className="text-gray-300">STAT</TableHead>
                    <TableHead className="text-gray-300">Tiempo</TableHead>
                    <TableHead className="text-gray-300">Comm</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processes.map((p: ProcessRow) => (
                    <TableRow key={p.pid} className="border-cyan-500/10">
                      <TableCell className="text-gray-200">{p.user}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-gray-200">
                        {p.pid}
                      </TableCell>
                      <TableCell className="text-right text-gray-200">
                        {p.pcpu}
                      </TableCell>
                      <TableCell className="text-right text-gray-200">
                        {p.pmem}
                      </TableCell>
                      <TableCell className="text-right text-gray-200">
                        {formatBytes(p.rssKb * 1024)}
                      </TableCell>
                      <TableCell className="text-xs text-gray-300">
                        {p.stat}
                      </TableCell>
                      <TableCell className="text-xs text-gray-300">
                        {p.etime}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs text-gray-300">
                        {p.command}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              !procMeta.skipped &&
              !procMeta.error && (
                <p className="text-sm text-gray-400">Sin filas.</p>
              )
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-black/50 border-2 border-cyan-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Log del miner-watchdog</CardTitle>
              <CardDescription className="font-mono text-xs break-all text-gray-400">
                {watchdogPath || "—"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {watchdogErr && !watchdogLines.length && (
                <p className="text-sm text-amber-400 mb-2">{watchdogErr}</p>
              )}
              <pre className="max-h-80 overflow-auto rounded-md border border-cyan-500/20 bg-black/60 p-3 text-[11px] leading-relaxed text-gray-300">
                {watchdogLines.length
                  ? watchdogLines.join("\n")
                  : watchdogErr
                    ? ""
                    : "(vacío)"}
              </pre>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-2 border-cyan-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Actualizaciones apt</CardTitle>
              <CardDescription className="text-gray-400">
                Lista de paquetes actualizables. Opcionalmente puedes aplicar{" "}
                <code className="text-cyan-400/90">update</code> +{" "}
                <code className="text-cyan-400/90">upgrade</code> desde aquí si
                el servidor lo permite (ver abajo).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {updates?.error && (
                <p className="text-sm text-red-400 mb-2">{updates.error}</p>
              )}
              {updates?.skipped && (
                <p className="text-sm text-gray-400 mb-2">{updates.reason}</p>
              )}
              {updates && !updates.error && !updates.skipped && (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-200">
                      <span className="font-semibold text-cyan-400">
                        {updates.packageCount}
                      </span>{" "}
                      paquetes actualizables
                      {updates.truncated ? " (lista truncada)" : ""}
                    </p>
                    {updates.packageCount > 0 && (
                      <div className="flex flex-col items-stretch sm:items-end gap-1 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={
                            aptApplyEnabled === true
                              ? "border-amber-500/50 text-amber-300 hover:bg-amber-500/10"
                              : "border-gray-600 text-gray-500 cursor-not-allowed opacity-80"
                          }
                          onClick={() => {
                            if (aptApplyEnabled === true) {
                              setAptDialogOpen(true);
                            }
                          }}
                          disabled={aptApplying || aptApplyEnabled !== true}
                          title={
                            aptApplyEnabled !== true
                              ? "En el servidor: LOMA_APT_APPLY_ENABLED=true y sudo NOPASSWD para /usr/bin/apt-get (usuario de PM2)."
                              : undefined
                          }
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {aptApplyEnabled === null
                            ? "Comprobando permisos…"
                            : aptApplying
                              ? "Ejecutando…"
                              : "Aplicar actualizaciones"}
                        </Button>
                        {aptApplyEnabled === false && (
                          <p className="text-[10px] text-amber-400/90 text-right max-w-[240px] leading-tight">
                            Botón desactivado: falta{" "}
                            <code className="text-cyan-400/80">LOMA_APT_APPLY_ENABLED=true</code>{" "}
                            en <code className="text-cyan-400/80">.env</code> del servidor +{" "}
                            <code className="text-cyan-400/80">sudo</code> sin contraseña para{" "}
                            <code className="text-cyan-400/80">apt-get</code>. Luego{" "}
                            <code className="text-cyan-400/80">npm run build</code> y reiniciar PM2.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {aptApplyEnabled === false && aptApplyHint && (
                    <p className="text-xs text-amber-400/90 border border-amber-500/30 rounded-md p-2 bg-amber-500/5">
                      {aptApplyHint}
                    </p>
                  )}
                  <ul className="max-h-80 overflow-auto text-sm space-y-1 text-gray-400">
                    {updates.packages.map((pkg) => (
                      <li key={pkg} className="font-mono text-xs">
                        {pkg}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {aptApplyLog && (
                <pre className="max-h-48 overflow-auto rounded-md border border-cyan-500/20 bg-black/60 p-2 text-[10px] text-gray-300 whitespace-pre-wrap">
                  {aptApplyLog}
                </pre>
              )}
            </CardContent>
          </Card>

          <AlertDialog open={aptDialogOpen} onOpenChange={setAptDialogOpen}>
            <AlertDialogContent className="bg-zinc-900 border-cyan-500/30 text-gray-100 sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">
                  ¿Aplicar apt update + upgrade?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  Se ejecutará en el servidor{" "}
                  <code className="text-cyan-400">sudo apt-get update</code> y
                  luego{" "}
                  <code className="text-cyan-400">
                    sudo apt-get upgrade -y
                  </code>{" "}
                  (modo no interactivo). Puede tardar varios minutos y reiniciar
                  servicios si un paquete lo requiere.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-gray-600 text-gray-300">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={(e) => {
                    e.preventDefault();
                    void runAptApply();
                  }}
                  disabled={aptApplying}
                >
                  {aptApplying ? "Ejecutando…" : "Sí, aplicar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {health?.generatedAt && (
          <p className="text-xs text-gray-500 text-center">
            Datos de salud:{" "}
            {new Date(health.generatedAt).toLocaleString("es-ES")}
          </p>
        )}
      </div>
    </div>
  );
}
