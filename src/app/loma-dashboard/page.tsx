
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Briefcase, Wrench, Users, ListChecks, PlusCircle, ArrowRight, Loader2 } from "lucide-react";
import { cn } from '@/lib/utils';

import { getHerramientasList } from '@/lib/herramientas-storage';
import { getPersonalList } from '@/lib/personal-storage';
import { getListasGarantia, type ListaGarantia } from '@/lib/garantias-storage';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  description?: string;
  className?: string; 
  headerBgClassName?: string; 
  headerContentColorClassName?: string; 
  viewDetailsLink?: string; 
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  className,
  headerBgClassName = "bg-muted", 
  headerContentColorClassName = "text-foreground",
  viewDetailsLink = "#"
}) => {
  
  const effectiveContentColor = headerBgClassName !== "bg-muted" && !headerBgClassName.includes("bg-background") && !headerBgClassName.includes("bg-card") ? "text-white" : headerContentColorClassName;

  return (
    <Card className={cn("shadow-sm hover:shadow-md transition-shadow overflow-hidden", className)}>
      <CardHeader className={cn("flex flex-row items-center justify-between space-y-0 py-3 px-4", headerBgClassName)}>
        <CardTitle className={cn("text-sm font-medium", effectiveContentColor)}>{title}</CardTitle>
        <Icon className={cn("h-5 w-5", effectiveContentColor)} />
      </CardHeader>
      <CardContent className="pt-3 pb-4 px-4 bg-card min-h-[76px]">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
      </CardContent>
      <CardFooter className={cn("p-0 border-t", headerBgClassName !== "bg-muted" ? "border-transparent" : "border-border")}>
          <Link
            href={viewDetailsLink}
            passHref
            className={cn(
              "block w-full text-center text-xs py-2.5 font-medium rounded-b-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              headerBgClassName, 
              effectiveContentColor, 
              headerBgClassName !== "bg-muted" && !headerBgClassName.includes("bg-background") && !headerBgClassName.includes("bg-card") ? "hover:brightness-90 active:brightness-75" : "hover:bg-muted/80"
            )}
          >
            View Details <ArrowRight className="inline h-3 w-3 ml-1" />
          </Link>
      </CardFooter>
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
        <CardFooter className="pt-2 pb-4">
            <Button variant="link" className="p-0 h-auto text-sm text-primary hover:text-primary/80 font-medium">
                Ir a la sección <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}


export default function LomaDashboardHomePage() {
  const [stats, setStats] = useState({
    totalHerramientas: 0,
    personalRegistrado: 0,
    listasGarantiaActivas: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const [herramientas, personal, listasGarantia] = await Promise.all([
          getHerramientasList(),
          getPersonalList(),
          getListasGarantia()
        ]);

        const activasListas = listasGarantia.filter(lista => 
          lista.estado === 'En Preparación' || lista.estado === 'Enviada' || lista.estado === 'En Proceso'
        ).length;

        setStats({
          totalHerramientas: herramientas.length,
          personalRegistrado: personal.length,
          listasGarantiaActivas: activasListas,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        // En caso de error, los stats se quedan en 0.
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-foreground">Bienvenido al Dashboard LOMA Tools</h1>
        </div>
        <p className="text-md text-muted-foreground">
          Gestiona tus herramientas, personal y garantías de forma eficiente utilizando los accesos rápidos a continuación.
        </p>
      </section>
      
      <section>
        <h2 className="text-xl font-semibold mb-4 text-foreground">Resumen General</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard 
            title="Herramientas Registradas" 
            value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalHerramientas} 
            icon={Wrench} 
            description="Total de herramientas en inventario"
            headerBgClassName="bg-blue-500"
            viewDetailsLink="/loma-dashboard/herramientas"
          />
          <StatCard 
            title="Personal Activo" 
            value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.personalRegistrado} 
            icon={Users} 
            description="Miembros del personal registrados"
            headerBgClassName="bg-green-500"
            viewDetailsLink="/loma-dashboard/personal"
          />
          <StatCard 
            title="Listas de Garantía Activas" 
            value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.listasGarantiaActivas} 
            icon={ListChecks}
            description="Listas en preparación, enviadas o en proceso"
            headerBgClassName="bg-orange-500"
            viewDetailsLink="/loma-dashboard/lista-garantias"
          />
        </div>
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

    </div>
  );
}
