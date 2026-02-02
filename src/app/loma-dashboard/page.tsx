
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Wrench, Users, ListChecks, PlusCircle, ArrowRight, Loader2, AlertTriangle, ShoppingCart, UserX, Send, Database, Smartphone } from "lucide-react";
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, differenceInDays, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { getHerramientasList, type Herramienta } from '@/lib/herramientas-storage';
import { getPersonalList } from '@/lib/personal-storage';
import { getListasGarantia, isHerramientaInActiveList } from '@/lib/garantias-storage';
import { getCustomWarrantyRules } from '@/lib/warranty-rules-storage';
import { estimateWarrantyFromSerialNumber } from '@/lib/warranty-utils';
import { checkServerDataAvailable } from '@/lib/loma-server-client';
import { ActiveShipmentsPanel } from '@/components/loma-dashboard/ActiveShipmentsPanel';
import { SmartSchedulerPanel } from '@/components/loma-dashboard/SmartSchedulerPanel';
import { TrackingManager } from '@/components/loma-dashboard/TrackingManager';
import { useDashboardSync } from '@/hooks/use-dashboard-sync';
import { useRealtimeInvalidate } from '@/hooks/use-realtime';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  description?: string;
  className?: string; 
  headerBgClassName?: string; 
  viewDetailsLink?: string; 
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  className,
  headerBgClassName = "bg-muted", 
  viewDetailsLink = "#"
}) => {
  
  const headerContentColorClassName = headerBgClassName !== "bg-muted" && !headerBgClassName.includes("bg-background") && !headerBgClassName.includes("bg-card") ? "text-white" : "text-foreground";

  return (
    <Card className={cn("shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col", className)}>
      <CardHeader className={cn("flex flex-row items-center justify-between space-y-0 py-3 px-4", headerBgClassName)}>
        <CardTitle className={cn("text-sm font-medium", headerContentColorClassName)}>{title}</CardTitle>
        <Icon className={cn("h-5 w-5", headerContentColorClassName)} />
      </CardHeader>
      <CardContent className="pt-4 pb-4 px-4 bg-card flex-grow">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
      </CardContent>
      <div className={cn("p-0 border-t", headerBgClassName !== "bg-muted" ? "border-transparent" : "border-border")}>
          <Link
            href={viewDetailsLink}
            passHref
            className={cn(
              "block w-full text-center text-xs py-2 font-medium rounded-b-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              headerBgClassName, 
              headerContentColorClassName, 
              headerBgClassName !== "bg-muted" && !headerBgClassName.includes("bg-background") && !headerBgClassName.includes("bg-card") ? "hover:brightness-90 active:brightness-75" : "hover:bg-muted/80"
            )}
          >
            Ver Detalles <ArrowRight className="inline h-3 w-3 ml-1" />
          </Link>
      </div>
    </Card>
  );
};

interface QuickActionProps {
  title: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

const QuickActionCard: React.FC<QuickActionProps> = ({ title, href, icon: Icon, description }) => {
  return (
    <Link href={href} passHref>
      <Card className="shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out hover:bg-muted/30 cursor-pointer h-full flex flex-col bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg flex-shrink-0">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg font-semibold text-foreground pt-1">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
        <div className="pt-2 pb-4 px-6">
            <Button variant="link" className="p-0 h-auto text-sm text-primary hover:text-primary/80 font-medium">
                Ir a la sección <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
        </div>
      </Card>
    </Link>
  );
}

type ExpiringTool = Herramienta & {
    daysUntilExpiration: number;
    formattedExpirationDate: string;
    expiresIn: string;
};

export default function LomaDashboardHomePage() {
  const [stats, setStats] = useState({
    totalHerramientas: 0,
    personalActivo: 0,
    personalInactivo: 0,
    listasGarantiaActivas: 0,
    soldHerramientas: 0,
    pendientesEnvio: 0,
  });
  const [expiringTools, setExpiringTools] = useState<ExpiringTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'server' | 'local' | null>(null);

  const fetchStats = async () => {
      setIsLoading(true);
      try {
        const [herramientas, personal, listasGarantia, rules] = await Promise.all([
          getHerramientasList(),
          getPersonalList(),
          getListasGarantia(),
          getCustomWarrantyRules(),
        ]);

        const activasListas = listasGarantia.filter(lista => 
          lista.estado === 'En Preparación' || lista.estado === 'Enviada'
        ).length;
        
        const soldCount = herramientas.filter(tool => tool.estado === 'Vendido').length;
        const inventoryCount = herramientas.filter(tool => tool.estado !== 'Vendido').length;
        
        const personalActivoCount = personal.filter(p => p.status === 'Activo').length;
        const personalInactivoCount = personal.length - personalActivoCount;

        // Calculate pending tools
        let pendientesCount = 0;
        const toolsRequiringRepair = herramientas.filter(h => h.estado === 'Requiere Reparación');
        for (const tool of toolsRequiringRepair) {
            const inActiveList = await isHerramientaInActiveList(tool.id, listasGarantia);
            if (!inActiveList) {
                pendientesCount++;
            }
        }

        setStats({
          totalHerramientas: inventoryCount,
          personalActivo: personalActivoCount,
          personalInactivo: personalInactivoCount,
          listasGarantiaActivas: activasListas,
          soldHerramientas: soldCount,
          pendientesEnvio: pendientesCount,
        });

        // Calculate upcoming expirations for tools that are not sold and not in an active warranty list
        const today = new Date();
        const EXPIRATION_THRESHOLD_DAYS = 30;
        
        const toolsInInventory = herramientas.filter(
            (tool) => tool.estado === 'Operativa' || tool.estado === 'Requiere Reparación'
        );

        const toolsToCheck = [];
        for (const tool of toolsInInventory) {
            const inActiveList = await isHerramientaInActiveList(tool.id, listasGarantia);
            if (!inActiveList) {
                toolsToCheck.push(tool);
            }
        }

        const upcomingExpirations = toolsToCheck
            .map(tool => {
                const warrantyInfo = estimateWarrantyFromSerialNumber(
                    tool.serialNumber,
                    tool.toolName,
                    tool.catNo,
                    rules,
                    tool.fechaVencimientoGarantia
                );
                if (warrantyInfo.status === 'Activa' && warrantyInfo.expirationDate) {
                    const expirationDate = parseISO(warrantyInfo.expirationDate);
                    const daysUntilExpiration = differenceInDays(expirationDate, today);
                    
                    if (daysUntilExpiration >= 0 && daysUntilExpiration <= EXPIRATION_THRESHOLD_DAYS) {
                        return {
                            ...tool,
                            daysUntilExpiration,
                            formattedExpirationDate: format(expirationDate, "PPP", { locale: es }),
                            expiresIn: formatDistanceToNow(expirationDate, { addSuffix: true, locale: es })
                        };
                    }
                }
                return null;
            })
            .filter((tool): tool is ExpiringTool => tool !== null)
            .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

        setExpiringTools(upcomingExpirations);

      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    let cancelled = false;
    checkServerDataAvailable().then((ok) => {
      if (!cancelled) setDataSource(ok ? 'server' : 'local');
    });
    return () => { cancelled = true; };
  }, []);

  useDashboardSync(fetchStats);
  useRealtimeInvalidate('herramientas', fetchStats);
  useRealtimeInvalidate('garantias', fetchStats);
  useRealtimeInvalidate('personal', fetchStats);

  const isEmpty =
    !isLoading &&
    stats.totalHerramientas === 0 &&
    stats.pendientesEnvio === 0 &&
    stats.listasGarantiaActivas === 0 &&
    stats.soldHerramientas === 0 &&
    stats.personalActivo === 0 &&
    stats.personalInactivo === 0;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-foreground">Bienvenido al Dashboard LOMA Tools</h1>
          {dataSource !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                dataSource === 'server'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              )}
              title={dataSource === 'server' ? 'Los datos se leen del servidor (base de datos).' : 'Los datos se leen solo de este navegador (modo local).'}
            >
              {dataSource === 'server' ? <Database className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
              {dataSource === 'server' ? 'Servidor' : 'Modo local'}
            </span>
          )}
        </div>
        <p className="text-md text-muted-foreground">
          Gestiona tus herramientas, personal y garantías de forma eficiente utilizando los accesos rápidos a continuación.
        </p>
      </section>

      {isEmpty && (
        <Card className="border-dashed border-2 border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">No hay datos cargados</CardTitle>
            <p className="text-sm text-muted-foreground">
              El resumen está en cero porque aún no hay herramientas, personal ni listas de garantía.
              {dataSource === 'local' && (
                <> Si sueles usar el dashboard en otro dispositivo o navegador, los datos están ahí; aquí se muestran solo los datos de este navegador (modo local).</>
              )}
              {dataSource === 'server' && (
                <> La base de datos del servidor está vacía. Agrega datos desde los accesos rápidos para que el resumen se actualice.</>
              )}
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="default" size="sm">
              <Link href="/loma-dashboard/herramientas">Agregar herramientas</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/loma-dashboard/personal">Administrar personal</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/loma-dashboard/garantias">Crear lista de garantía</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4 text-foreground">Resumen General</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard 
            title="Herramientas en Inventario"
            value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalHerramientas} 
            icon={Wrench} 
            description="Operativas y en reparación"
            headerBgClassName="bg-blue-500"
            viewDetailsLink="/loma-dashboard/herramientas"
          />
          <StatCard 
            title="Pendientes de Envío"
            value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.pendientesEnvio} 
            icon={Send} 
            description="Herramientas por enviar a garantía"
            headerBgClassName="bg-red-500"
            viewDetailsLink="/loma-dashboard/garantias"
          />
          <StatCard 
            title="Listas de Garantía Activas"
            value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.listasGarantiaActivas} 
            icon={ListChecks}
            description="Listas en preparación o en proceso"
            headerBgClassName="bg-orange-500"
            viewDetailsLink="/loma-dashboard/lista-garantias"
          />
          <StatCard 
            title="Herramientas Vendidas"
            value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.soldHerramientas} 
            icon={ShoppingCart}
            description="Total de artículos vendidos"
            headerBgClassName="bg-purple-500"
            viewDetailsLink="/loma-dashboard/vendidos"
          />
          <StatCard 
            title="Personal Activo"
            value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.personalActivo} 
            icon={Users} 
            description="Miembros del personal disponibles"
            headerBgClassName="bg-green-500"
            viewDetailsLink="/loma-dashboard/personal"
          />
           <StatCard 
            title="Personal Inactivo" 
            value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.personalInactivo} 
            icon={UserX}
            description="Personal archivado no disponible"
            headerBgClassName="bg-slate-500"
            viewDetailsLink="/loma-dashboard/personal"
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500"/>
            Garantías Próximas a Vencer (30 días)
        </h2>
        <Card>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex justify-center items-center p-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : expiringTools.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Herramienta</TableHead>
                                    <TableHead>S/N</TableHead>
                                    <TableHead>Vence</TableHead>
                                    <TableHead className="text-right">Fecha Vencimiento</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expiringTools.map(tool => (
                                    <TableRow key={tool.id}>
                                        <TableCell className="font-medium max-w-xs truncate" title={tool.toolName}>
                                            <Link href={`/loma-dashboard/herramientas`}>
                                                <span className="hover:underline cursor-pointer">{tool.toolName}</span>
                                            </Link>
                                        </TableCell>
                                        <TableCell>{tool.serialNumber || 'N/A'}</TableCell>
                                        <TableCell className="font-medium text-orange-600 dark:text-orange-400">{tool.expiresIn}</TableCell>
                                        <TableCell className="text-right">{tool.formattedExpirationDate}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <p className="text-muted-foreground p-8 text-center">No hay garantías próximas a vencer en los siguientes 30 días.</p>
                )}
            </CardContent>
        </Card>
     </section>
      
      <section>
        <h2 className="text-xl font-semibold mb-4 text-foreground">Accesos Rápidos</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard 
            title="Gestionar Herramientas"
            href="/loma-dashboard/herramientas"
            icon={Wrench}
            description="Agrega, edita o elimina herramientas del inventario."
          />
          <QuickActionCard 
            title="Administrar Personal"
            href="/loma-dashboard/personal"
            icon={Users}
            description="Consulta y gestiona la información del personal."
          />
          <QuickActionCard 
            title="Crear Lista de Garantía"
            href="/loma-dashboard/garantias"
            icon={PlusCircle}
            description="Prepara un nuevo envío de herramientas para garantía."
          />
        </div>
      </section>

      {/* Panel de Envíos Activos */}
      <section>
        <ActiveShipmentsPanel />
      </section>

      {/* Panel del Sistema Inteligente */}
      <section>
        <SmartSchedulerPanel />
      </section>



      {/* Panel de Gestor de Trackings */}
      <section>
        <TrackingManager />
      </section>

    </div>
  );
}
