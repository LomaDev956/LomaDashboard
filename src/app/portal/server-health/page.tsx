"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
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
  aptApplyStream: "/api/loma/server-monitor/apt-apply/run-stream",
  reboot: "/api/loma/server-monitor/reboot",
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
  const [aptEnvStatus, setAptEnvStatus] = useState<
    "on" | "missing" | "invalid" | "not_linux" | null
  >(null);
  const [aptDialogOpen, setAptDialogOpen] = useState(false);
  const [aptApplying, setAptApplying] = useState(false);
  const [aptApplyLog, setAptApplyLog] = useState<string | null>(null);
  const [aptRunPhase, setAptRunPhase] = useState<string | null>(null);
  const [aptRunProgress, setAptRunProgress] = useState<number>(0);
  const aptEventSourceRef = useRef<EventSource | null>(null);
  const [aptApplyResult, setAptApplyResult] = useState<{
    ok: boolean;
    update: { stdout: string; stderr: string };
    upgrade: { stdout: string; stderr: string };
  } | null>(null);

  const [rebootEnabled, setRebootEnabled] = useState<boolean | null>(null);
  const [rebootRequired, setRebootRequired] = useState<boolean | null>(null);
  const [rebootHint, setRebootHint] = useState<string>("");
  const [rebootApplying, setRebootApplying] = useState(false);
  const [rebootLog, setRebootLog] = useState<string | null>(null);

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

      try {
        const aptRes = await fetch(MONITOR.aptApply, { credentials: "include" });
        const aj = (await aptRes.json()) as {
          enabled?: boolean;
          hint?: string;
          aptEnvStatus?: string;
        };
        if (aptRes.status === 401) {
          setAptApplyEnabled(false);
          setAptApplyHint(
            "Sin sesión para comprobar apt: recarga la página o vuelve a iniciar sesión en el portal."
          );
          setAptEnvStatus(null);
        } else {
          setAptApplyEnabled(!!aj.enabled);
          setAptApplyHint(typeof aj.hint === "string" ? aj.hint : "");
          const s = aj.aptEnvStatus;
          if (s === "on" || s === "missing" || s === "invalid" || s === "not_linux") {
            setAptEnvStatus(s);
          } else {
            setAptEnvStatus(null);
          }
        }
      } catch {
        setAptApplyEnabled(false);
        setAptApplyHint("");
        setAptEnvStatus(null);
      }

      try {
        const rRes = await fetch(MONITOR.reboot, { credentials: "include" });
        const rJson = (await rRes.json()) as {
          enabled?: boolean;
          hint?: string;
          rebootRequired?: boolean;
        };
        if (rRes.ok) {
          setRebootEnabled(!!rJson.enabled);
          setRebootHint(typeof rJson.hint === "string" ? rJson.hint : "");
          setRebootRequired(!!rJson.rebootRequired);
        } else {
          setRebootEnabled(false);
          setRebootHint("");
          setRebootRequired(false);
        }
      } catch {
        setRebootEnabled(false);
        setRebootHint("");
        setRebootRequired(false);
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
    return () => {
      try {
        aptEventSourceRef.current?.close();
      } catch {
        // ignore
      }
    };
  }, []);

  const runAptApply = useCallback(() => {
    setAptApplying(true);
    setAptApplyResult(null);
    setAptRunPhase("Preparando...");
    setAptRunProgress(0);
    setAptApplyLog("Iniciando apt-get update + upgrade...\n");

    // Si el usuario dispara esto varias veces, cerramos el anterior.
    try {
      aptEventSourceRef.current?.close();
    } catch {
      // ignore
    }

    let finished = false;

    const appendLog = (text: string) => {
      setAptApplyLog((prev) => {
        const next = `${prev ?? ""}${text ?? ""}`;
        const max = 20_000;
        if (next.length <= max) return next;
        return next.slice(-max);
      });
    };

    const es = new EventSource(MONITOR.aptApplyStream, {
      withCredentials: true,
    });
    aptEventSourceRef.current = es;

    es.addEventListener("phase", (evt) => {
      try {
        const p = JSON.parse(String(evt.data)) as {
          phase?: string;
          progress?: number;
          message?: string;
        };
        if (finished) return;
        const phase = p.phase ?? null;
        setAptRunPhase(
          phase === "done" ? "Finalizado" : p.message || (phase ?? "Ejecutando")
        );
        if (typeof p.progress === "number") setAptRunProgress(p.progress);
      } catch {
        // ignore malformed events
      }
    });

    es.addEventListener("stdout", (evt) => {
      if (finished) return;
      try {
        const p = JSON.parse(String(evt.data)) as { text?: string };
        appendLog(p.text ?? "");
      } catch {
        appendLog(String(evt.data));
      }
    });

    es.addEventListener("stderr", (evt) => {
      if (finished) return;
      try {
        const p = JSON.parse(String(evt.data)) as { text?: string };
        appendLog(p.text ?? "");
      } catch {
        appendLog(String(evt.data));
      }
    });

    es.addEventListener("done", async (evt) => {
      finished = true;
      try {
        es.close();
      } catch {
        // ignore
      }
      aptEventSourceRef.current = null;

      try {
        const d = JSON.parse(String(evt.data)) as {
          ok?: boolean;
          error?: string;
          update?: { stdout: string; stderr: string };
          upgrade?: { stdout: string; stderr: string };
        };

        setAptRunPhase("Finalizado");
        setAptRunProgress(100);

        if (d.ok) {
          setAptApplyResult({
            ok: true,
            update: d.update ?? { stdout: "", stderr: "" },
            upgrade: d.upgrade ?? { stdout: "", stderr: "" },
          });
        } else {
          appendLog(`\n\nERROR: ${d.error ?? "apt apply falló"}`);
        }
      } finally {
        setAptApplying(false);
        setAptDialogOpen(false);
        await load();
      }
    });

    es.onerror = () => {
      if (finished) return;
      finished = true;
      try {
        es.close();
      } catch {
        // ignore
      }
      aptEventSourceRef.current = null;
      setAptApplying(false);
      setAptDialogOpen(false);
      setAptRunPhase("Error");
      setAptRunProgress(0);
      appendLog(
        "\n\nError de conexión al stream (posible sesión expirada o endpoint deshabilitado)."
      );
    };
  }, [load]);

  const runReboot = useCallback(async () => {
    setRebootApplying(true);
    setRebootLog(null);
    try {
      const res = await fetch(MONITOR.reboot, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setRebootLog(j.error ?? `HTTP ${res.status}`);
        return;
      }
      setRebootLog(
        "Reiniciando el servidor. La conexión puede caerse unos minutos."
      );
    } catch (e) {
      setRebootLog(e instanceof Error ? e.message : "Error de red");
    } finally {
      setRebootApplying(false);
    }
  }, []);

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
                          className={cn(
                            "shadow-none",
                            aptApplyEnabled === true
                              ? "border-zinc-600/70 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-500/60 hover:text-zinc-100"
                              : "border-zinc-700 bg-zinc-950/70 text-zinc-500 cursor-not-allowed opacity-90"
                          )}
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
                        {aptApplyEnabled === false && aptEnvStatus && (
                          <p className="text-[10px] text-gray-500 text-right max-w-[260px] leading-tight">
                            {aptEnvStatus === "missing" && (
                              <>
                                Variable no cargada en el proceso Node (revisa{" "}
                                <code className="text-cyan-400/70">.env.local</code> y PM2).
                              </>
                            )}
                            {aptEnvStatus === "invalid" && (
                              <>
                                Valor no válido: usa{" "}
                                <code className="text-cyan-400/70">LOMA_APT_APPLY_ENABLED=true</code>.
                              </>
                            )}
                            {aptEnvStatus === "not_linux" && "Solo aplica en servidor Linux."}
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
              {aptApplying && (
                <div className="space-y-2 rounded-md border border-zinc-700/60 bg-zinc-950/40 p-3 mt-4">
                  <p className="text-xs text-zinc-400">
                    {aptRunPhase ?? "Ejecutando..."}
                  </p>
                  <Progress
                    value={aptRunProgress}
                    className="bg-zinc-800"
                  />
                </div>
              )}
              {aptApplyResult && aptApplyResult.ok && (
                <div className="space-y-3 rounded-md border border-zinc-700/60 bg-zinc-950/40 p-3">
                  <p className="text-xs font-medium text-zinc-400">
                    Última ejecución: dos pasos en el servidor
                  </p>
                  {(
                    [
                      {
                        step: 1,
                        title: "apt-get update",
                        cmd: "sudo -n apt-get update -q",
                        out: aptApplyResult.update,
                      },
                      {
                        step: 2,
                        title: "apt-get upgrade",
                        cmd: "sudo -n apt-get upgrade -y -q",
                        out: aptApplyResult.upgrade,
                      },
                    ] as const
                  ).map(({ step, title, cmd, out }) => {
                    const hasText =
                      (out.stdout && out.stdout.trim()) ||
                      (out.stderr && out.stderr.trim());
                    return (
                      <div
                        key={step}
                        className="rounded border border-zinc-800/80 bg-black/35 p-2"
                      >
                        <p className="text-[11px] font-semibold text-cyan-500/90">
                          {step}. {title}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono mb-1">
                          {cmd}
                        </p>
                        {!hasText ? (
                          <p className="text-[10px] text-zinc-500 italic">
                            Sin salida en consola (típico con{" "}
                            <code className="text-zinc-400">-q</code>).
                          </p>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-auto">
                            {!!out.stdout?.trim() && (
                              <pre className="text-[10px] leading-relaxed whitespace-pre-wrap text-zinc-300">
                                {out.stdout}
                              </pre>
                            )}
                            {!!out.stderr?.trim() && (
                              <pre
                                className={cn(
                                  "text-[10px] leading-relaxed whitespace-pre-wrap",
                                  /dpkg-preconfigure: unable to re-open stdin/i.test(
                                    out.stderr
                                  )
                                    ? "text-zinc-500"
                                    : "text-amber-200/90"
                                )}
                              >
                                {out.stderr}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {rebootRequired === true && (
                <div className="space-y-2 rounded-md border border-zinc-700/60 bg-zinc-950/40 p-3 mt-4">
                  <p className="text-sm font-semibold text-emerald-300">
                    Reboot recomendado
                  </p>
                  {rebootEnabled === true ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-emerald-600/50 bg-zinc-950/50 text-emerald-200 hover:bg-zinc-900 hover:text-emerald-100 hover:border-emerald-500/70"
                      onClick={() => {
                        void runReboot();
                      }}
                      disabled={rebootApplying}
                    >
                      Reiniciar servidor
                    </Button>
                  ) : (
                    <p className="text-[12px] text-amber-300/90 leading-tight">
                      {rebootHint}
                    </p>
                  )}
                  {rebootLog && (
                    <p className="text-[11px] text-gray-300 whitespace-pre-wrap">
                      {rebootLog}
                    </p>
                  )}
                </div>
              )}
              {aptApplyLog && (
                <pre
                  className={cn(
                    "max-h-48 overflow-auto rounded-md border p-3 text-[11px] leading-relaxed whitespace-pre-wrap",
                    aptApplyLog.includes("password is required") ||
                      aptApplyLog.toLowerCase().includes("sudo:")
                      ? "border-rose-900/40 bg-rose-950/25 text-rose-100/90"
                      : "border-cyan-500/20 bg-black/60 text-gray-300"
                  )}
                >
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
                  className="!shadow-none !border !border-zinc-600/70 !bg-zinc-800/60 !text-zinc-200 hover:!bg-zinc-700/70 hover:!text-white hover:!border-zinc-500/70"
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
