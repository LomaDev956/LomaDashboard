// Panel simplificado de tracking automático
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  startSmartScheduler, 
  stopSmartScheduler, 
  getSmartSchedulerState,
  type SmartUpdate
} from "@/lib/smart-scheduler";
import { 
  Bot, 
  Clock, 
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SimpleTrackingPanelProps {
  onUpdatesReceived?: (updates: SmartUpdate[]) => void;
}

export function SimpleTrackingPanel({ onUpdatesReceived }: SimpleTrackingPanelProps) {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [nextCheck, setNextCheck] = useState<Date | null>(null);
  const [totalUpdates, setTotalUpdates] = useState(0);
  const [scheduledChecks, setScheduledChecks] = useState(0);

  // Actualizar estado cada 30 segundos
  useEffect(() => {
    const updateState = () => {
      const state = getSmartSchedulerState();
      setIsRunning(state.isRunning);
      setTotalUpdates(state.updates.length);
      setScheduledChecks(state.scheduledChecks.length);
      
      // Encontrar próxima verificación
      const upcoming = state.scheduledChecks
        .filter(check => !check.completed && new Date(check.scheduledTime) > new Date())
        .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
      
      setNextCheck(upcoming.length > 0 ? new Date(upcoming[0].scheduledTime) : null);
    };

    updateState();
    const interval = setInterval(updateState, 30000);

    return () => clearInterval(interval);
  }, []);

  // Escuchar actualizaciones
  useEffect(() => {
    const handleUpdates = (event: CustomEvent<SmartUpdate[]>) => {
      const updates = event.detail;
      setTotalUpdates(prev => prev + updates.length);
      
      if (onUpdatesReceived) {
        onUpdatesReceived(updates);
      }

      // Mostrar notificación
      toast({
        title: "Actualizaciones encontradas",
        description: `${updates.length} nueva(s) actualización(es) encontrada(s)`,
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('smartUpdates', handleUpdates as EventListener);
      return () => window.removeEventListener('smartUpdates', handleUpdates as EventListener);
    }
  }, [onUpdatesReceived, toast]);

  const handleToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        await startSmartScheduler();
        toast({
          title: "Sistema inteligente activado",
          description: "Verificaciones programadas 2 veces al día con horarios aleatorios",
        });
      } else {
        stopSmartScheduler();
        toast({
          title: "Sistema inteligente desactivado",
          description: "Todas las verificaciones programadas se han cancelado",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del sistema",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Tracking Automático</CardTitle>
          </div>
          <Switch
            checked={isRunning}
            onCheckedChange={handleToggle}
          />
        </div>
        <CardDescription>
          Sistema inteligente: 2 verificaciones diarias con horarios aleatorios
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Estado actual */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Estado:</span>
          <Badge variant={isRunning ? "default" : "secondary"}>
            {isRunning ? "Activo" : "Inactivo"}
          </Badge>
        </div>

        {/* Próxima verificación */}
        {nextCheck && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Próxima verificación:</span>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(nextCheck, "HH:mm", { locale: es })}
            </div>
          </div>
        )}

        {/* Verificaciones programadas */}
        {scheduledChecks > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Verificaciones programadas:</span>
            <span className="text-sm font-semibold">{scheduledChecks}</span>
          </div>
        )}

        {/* Total de actualizaciones */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Actualizaciones encontradas:</span>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span className="text-sm font-semibold">{totalUpdates}</span>
          </div>
        </div>

        {/* Información adicional */}
        {isRunning && (
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            🧠 Horarios aleatorios: Mañana (8:00-11:00) y Noche (18:00-21:00)
          </div>
        )}
      </CardContent>
    </Card>
  );
}