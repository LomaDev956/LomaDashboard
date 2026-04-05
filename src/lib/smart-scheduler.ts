// Sistema inteligente de verificación con horarios aleatorios
'use client';

import { getListasGarantia, updateListaGarantiaEstado, type ListaGarantia } from './garantias-storage';
import { getPersonalList, type Personal } from './personal-storage';
import { getCleanTrackingInfo } from './tracking-clean';
// Milwaukee service removed - keeping interface for compatibility
export interface MilwaukeeCredentials {
  username: string;
  password: string;
}

export interface SmartScheduleConfig {
  enabled: boolean;
  morningWindow: { start: number; end: number };
  eveningWindow: { start: number; end: number };
  randomizeMinutes: boolean;
  groupByCredentials: boolean;
  maxRetries: number;
}

export interface ScheduledCheck {
  id: string;
  type: 'morning' | 'evening';
  scheduledTime: Date;
  credentials: MilwaukeeCredentials;
  listIds: string[];
  completed: boolean;
}

export interface SmartUpdate {
  type: 'milwaukee' | 'tracking';
  listaId: string;
  source: string;
  oldStatus: string;
  newStatus: string;
  details: any;
  timestamp: string;
}

class SmartScheduler {
  private config: SmartScheduleConfig = {
    enabled: false,
    morningWindow: { start: 8, end: 11 },    // 8:00-11:00 AM
    eveningWindow: { start: 18, end: 21 },   // 6:00-9:00 PM
    randomizeMinutes: true,
    groupByCredentials: true,
    maxRetries: 2
  };

  private scheduledChecks: ScheduledCheck[] = [];
  private timeouts: NodeJS.Timeout[] = [];
  private isRunning = false;
  private updates: SmartUpdate[] = [];

  constructor() {
    this.loadConfig();
  }

  // Configuración persistente
  private loadConfig() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smart-scheduler-config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    }
  }

  private saveConfig() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smart-scheduler-config', JSON.stringify(this.config));
    }
  }

  // Iniciar sistema inteligente
  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.config.enabled = true;
    this.saveConfig();

    console.log('🧠 Iniciando sistema inteligente de verificación...');

    // Programar verificaciones para hoy y mañana
    await this.scheduleChecks();

    // Reprogramar cada día a medianoche
    this.scheduleDailyRescheduling();

    console.log(`✅ Sistema programado: ${this.scheduledChecks.length} verificaciones`);
  }

  // Detener sistema
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.config.enabled = false;
    this.saveConfig();

    // Cancelar todos los timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts = [];
    this.scheduledChecks = [];

    console.log('🛑 Sistema inteligente detenido');
  }

  // Programar verificaciones
  private async scheduleChecks() {
    try {
      // Obtener listas activas y personal
      const listas = await getListasGarantia();
      const personal = await getPersonalList();

      const activeListas = listas.filter(lista => 
        lista.estado !== 'Finalizada' && 
        lista.estado !== 'Cancelada'
      );

      // Agrupar listas por credenciales Milwaukee
      const credentialGroups = this.groupListsByCredentials(activeListas, personal);

      console.log(`📋 ${activeListas.length} listas activas, ${credentialGroups.length} cuentas Milwaukee`);

      // Programar verificaciones para cada grupo
      for (const group of credentialGroups) {
        await this.scheduleGroupChecks(group);
      }

    } catch (error) {
      console.error('❌ Error programando verificaciones:', error);
    }
  }

  // Agrupar listas por credenciales
  private groupListsByCredentials(listas: ListaGarantia[], personal: Personal[]) {
    const groups: { credentials: MilwaukeeCredentials; listIds: string[] }[] = [];

    for (const lista of listas) {
      // Encontrar persona asignada
      const persona = personal.find(p => p.id === lista.personalId);
      if (!persona || !persona.milwaukeeUser || !persona.milwaukeePassword) continue;

      const credentials: MilwaukeeCredentials = {
        username: persona.milwaukeeUser,
        password: persona.milwaukeePassword
      };

      // Buscar grupo existente con las mismas credenciales
      let group = groups.find(g => 
        g.credentials.username === credentials.username &&
        g.credentials.password === credentials.password
      );

      if (!group) {
        group = { credentials, listIds: [] };
        groups.push(group);
      }

      group.listIds.push(lista.id);
    }

    return groups;
  }

  // Programar verificaciones para un grupo
  private async scheduleGroupChecks(group: { credentials: MilwaukeeCredentials; listIds: string[] }) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Programar para hoy (si aún hay tiempo)
    const todayMorning = this.getRandomTimeInWindow(today, this.config.morningWindow);
    const todayEvening = this.getRandomTimeInWindow(today, this.config.eveningWindow);

    if (todayMorning > new Date()) {
      this.scheduleCheck('morning', todayMorning, group.credentials, group.listIds);
    }

    if (todayEvening > new Date()) {
      this.scheduleCheck('evening', todayEvening, group.credentials, group.listIds);
    }

    // Programar para mañana
    const tomorrowMorning = this.getRandomTimeInWindow(tomorrow, this.config.morningWindow);
    const tomorrowEvening = this.getRandomTimeInWindow(tomorrow, this.config.eveningWindow);

    this.scheduleCheck('morning', tomorrowMorning, group.credentials, group.listIds);
    this.scheduleCheck('evening', tomorrowEvening, group.credentials, group.listIds);
  }

  // Obtener hora aleatoria en ventana
  private getRandomTimeInWindow(date: Date, window: { start: number; end: number }): Date {
    const result = new Date(date);
    
    // Hora aleatoria entre start y end
    const randomHour = window.start + Math.random() * (window.end - window.start);
    const hour = Math.floor(randomHour);
    const minutes = this.config.randomizeMinutes ? Math.floor(Math.random() * 60) : 0;

    result.setHours(hour, minutes, 0, 0);
    return result;
  }

  // Programar una verificación específica
  private scheduleCheck(
    type: 'morning' | 'evening',
    scheduledTime: Date,
    credentials: MilwaukeeCredentials,
    listIds: string[]
  ) {
    const checkId = `${type}-${scheduledTime.getTime()}-${credentials.username}`;
    
    const scheduledCheck: ScheduledCheck = {
      id: checkId,
      type,
      scheduledTime,
      credentials,
      listIds,
      completed: false
    };

    this.scheduledChecks.push(scheduledCheck);

    // Programar timeout
    const delay = scheduledTime.getTime() - Date.now();
    if (delay > 0) {
      const timeout = setTimeout(() => {
        this.executeCheck(scheduledCheck);
      }, delay);

      this.timeouts.push(timeout);

      console.log(`⏰ Verificación programada: ${type} a las ${scheduledTime.toLocaleTimeString()} para ${listIds.length} listas`);
    }
  }

  // Ejecutar verificación
  private async executeCheck(check: ScheduledCheck) {
    if (check.completed || !this.isRunning) return;

    console.log(`🔍 Ejecutando verificación ${check.type} para ${check.listIds.length} listas...`);

    try {
      const updates: SmartUpdate[] = [];

      // 1. Verificar Milwaukee
      const milwaukeeUpdates = await this.checkMilwaukeeForLists(check.credentials, check.listIds);
      updates.push(...milwaukeeUpdates);

      // 2. Verificar tracking
      const trackingUpdates = await this.checkTrackingForLists(check.listIds);
      updates.push(...trackingUpdates);

      // 3. Procesar actualizaciones
      if (updates.length > 0) {
        this.updates.push(...updates);
        this.notifyUpdates(updates);
        console.log(`✅ ${updates.length} actualizaciones encontradas`);
      } else {
        console.log('📋 No hay actualizaciones');
      }

      check.completed = true;

    } catch (error) {
      console.error(`❌ Error en verificación ${check.type}:`, error);
      
      // Reintentar si no se han agotado los intentos
      if (check.type === 'morning') {
        // Reintentar en 30 minutos
        setTimeout(() => this.executeCheck(check), 30 * 60 * 1000);
      }
    }
  }

  // Verificar Milwaukee para listas específicas
  private async checkMilwaukeeForLists(
    credentials: MilwaukeeCredentials, 
    listIds: string[]
  ): Promise<SmartUpdate[]> {
    try {
      // Milwaukee service removed - return empty updates
      console.log('⚠️ Milwaukee service disabled - no updates available');
      
      const updates: SmartUpdate[] = [];
      
      // Milwaukee functionality removed
      // Keeping structure for compatibility
      
      return updates;
    } catch (error) {
      console.error('❌ Error verificando Milwaukee:', error);
      return [];
    }
  }

  // Verificar tracking para listas específicas
  private async checkTrackingForLists(listIds: string[]): Promise<SmartUpdate[]> {
    try {
      const updates: SmartUpdate[] = [];
      const listas = await getListasGarantia();

      for (const listId of listIds) {
        const lista = listas.find(l => l.id === listId);
        if (!lista) continue;

        // Verificar tracking de ida
        if (lista.trackingIda && (lista.estado === 'En Preparación' || lista.estado === 'Enviada')) {
          const update = await this.checkSingleTracking(lista, lista.trackingIda, false);
          if (update) updates.push(update);
        }

        // Verificar tracking de vuelta
        if (lista.trackingVenida && (lista.estado === 'Entregada' || lista.estado === 'Recibida para Inspección')) {
          const update = await this.checkSingleTracking(lista, lista.trackingVenida, true);
          if (update) updates.push(update);
        }

        // Pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return updates;
    } catch (error) {
      console.error('❌ Error verificando tracking:', error);
      return [];
    }
  }

  // Verificar tracking individual
  private async checkSingleTracking(
    lista: ListaGarantia,
    trackingNumber: string,
    isReturn: boolean
  ): Promise<SmartUpdate | null> {
    try {
      const result = await getCleanTrackingInfo(trackingNumber);
      
      if (!result.success || !result.status) return null;

      const newStatus = this.mapTrackingStatus(result.status, lista.estado, isReturn);
      
      if (newStatus && newStatus !== lista.estado) {
        await updateListaGarantiaEstado(lista.id, newStatus);
        
        return {
          type: 'tracking',
          listaId: lista.id,
          source: trackingNumber,
          oldStatus: lista.estado,
          newStatus,
          details: result,
          timestamp: new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Error verificando tracking ${trackingNumber}:`, error);
      return null;
    }
  }

  // Mapear estados
  private mapMilwaukeeStatus(status: string): any {
    // Implementar mapeo según los estados reales de Milwaukee
    return null;
  }

  private mapTrackingStatus(status: string, currentStatus: string, isReturn: boolean): any {
    const statusLower = status.toLowerCase();
    
    // Palabras clave para detectar entregas
    const deliveredKeywords = [
      'entregado', 'delivered', 'delivery', 'completado', 'completed',
      'recibido', 'received', 'finalizado', 'finished'
    ];
    
    // Palabras clave para detectar envíos/tránsito
    const inTransitKeywords = [
      'en camino', 'in transit', 'shipped', 'enviado', 'despachado',
      'out for delivery', 'en ruta', 'en tránsito'
    ];

    const isDelivered = deliveredKeywords.some(keyword => statusLower.includes(keyword));
    const isInTransit = inTransitKeywords.some(keyword => statusLower.includes(keyword));

    // Flujo de ida (herramientas van a Milwaukee)
    if (!isReturn) {
      // En Preparación → Enviada (cuando se detecta envío)
      if (currentStatus === 'En Preparación' && isInTransit) {
        return 'Enviada';
      }
      
      // Enviada → Entregada (cuando Milwaukee recibe)
      if (currentStatus === 'Enviada' && isDelivered) {
        return 'Entregada';
      }
    } 
    // Flujo de vuelta (herramientas regresan de Milwaukee)
    else {
      // Entregada → Recibida para Inspección (cuando Milwaukee termina y envía de vuelta)
      if (currentStatus === 'Entregada' && isInTransit) {
        return 'Recibida para Inspección';
      }
      
      // Recibida para Inspección → Finalizada (cuando recibimos de vuelta)
      if (currentStatus === 'Recibida para Inspección' && isDelivered) {
        return 'Finalizada';
      }
    }

    return null;
  }

  private findMatchingOrder(lista: ListaGarantia, orders: any[]): any {
    // Implementar lógica para encontrar orden correspondiente
    return null;
  }

  // Programar reprogramación diaria
  private scheduleDailyRescheduling() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 5, 0, 0); // 00:05 AM

    const delay = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      if (this.isRunning) {
        console.log('🔄 Reprogramando verificaciones diarias...');
        this.scheduleChecks();
        this.scheduleDailyRescheduling(); // Programar para el siguiente día
      }
    }, delay);
  }

  // Notificar actualizaciones
  private notifyUpdates(updates: SmartUpdate[]) {
    // Notificaciones del navegador
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      updates.forEach(update => {
        const title = update.type === 'milwaukee' ? 'Actualización Milwaukee' : 'Actualización Tracking';
        const body = `Lista ${update.listaId}: ${update.oldStatus} → ${update.newStatus}`;
        
        new Notification(title, {
          body,
          icon: '/favicon.ico'
        });
      });
    }

    // Evento personalizado
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartUpdates', { detail: updates }));
    }
  }

  // Getters públicos
  getConfig() { return { ...this.config }; }
  getIsRunning() { return this.isRunning; }
  getScheduledChecks() { return [...this.scheduledChecks]; }
  getUpdates() { return [...this.updates]; }
  
  // Configuración
  updateConfig(newConfig: Partial<SmartScheduleConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

// Instancia singleton
export const smartScheduler = new SmartScheduler();

// Funciones de conveniencia
export const startSmartScheduler = () => smartScheduler.start();
export const stopSmartScheduler = () => smartScheduler.stop();
export const getSmartSchedulerState = () => ({
  isRunning: smartScheduler.getIsRunning(),
  config: smartScheduler.getConfig(),
  scheduledChecks: smartScheduler.getScheduledChecks(),
  updates: smartScheduler.getUpdates()
});