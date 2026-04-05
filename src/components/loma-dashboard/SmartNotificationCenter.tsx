'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  X, 
  CheckCircle, 
  Truck, 
  Brain,
  Clock,
  ExternalLink
} from 'lucide-react';
import { getSmartSchedulerState, type SmartUpdate } from '@/lib/smart-scheduler';
import Link from 'next/link';

interface NotificationItem extends SmartUpdate {
  id: string;
  read: boolean;
}

export function SmartNotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Cargar notificaciones guardadas
    loadNotifications();

    // Escuchar nuevas actualizaciones del sistema inteligente
    const handleSmartUpdates = (event: CustomEvent<SmartUpdate[]>) => {
      const newUpdates = event.detail;
      addNewNotifications(newUpdates);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('smartUpdates', handleSmartUpdates as EventListener);
      return () => window.removeEventListener('smartUpdates', handleSmartUpdates as EventListener);
    }
  }, []);

  const loadNotifications = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smart-notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        setNotifications(parsed);
        setUnreadCount(parsed.filter((n: NotificationItem) => !n.read).length);
      }
    }
  };

  const saveNotifications = (notifications: NotificationItem[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smart-notifications', JSON.stringify(notifications));
    }
  };

  const addNewNotifications = (updates: SmartUpdate[]) => {
    const newNotifications = updates.map(update => ({
      ...update,
      id: `${update.listaId}-${update.timestamp}`,
      read: false
    }));

    setNotifications(prev => {
      const updated = [...newNotifications, ...prev].slice(0, 50); // Mantener solo las últimas 50
      saveNotifications(updated);
      return updated;
    });

    setUnreadCount(prev => prev + newNotifications.length);

    // Mostrar notificación del navegador
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      newNotifications.forEach(notification => {
        const title = notification.type === 'milwaukee' ? '🔧 Actualización Milwaukee' : '📦 Actualización Tracking';
        const body = `Lista ${notification.listaId}: ${notification.oldStatus} → ${notification.newStatus}`;
        
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: notification.id
        });
      });
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return updated;
    });

    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('smart-notifications');
    }
  };

  const getNotificationIcon = (type: string) => {
    return type === 'milwaukee' ? (
      <div className="p-1.5 bg-blue-100 rounded-full">
        <Brain className="h-3 w-3 text-blue-600" />
      </div>
    ) : (
      <div className="p-1.5 bg-green-100 rounded-full">
        <Truck className="h-3 w-3 text-green-600" />
      </div>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `hace ${minutes} min`;
    } else if (diffInHours < 24) {
      return `hace ${Math.floor(diffInHours)}h`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 z-50">
          <Card className="shadow-lg border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notificaciones Inteligentes
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {notifications.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Marcar todo leído
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearNotifications}
                    className="text-xs"
                  >
                    Limpiar todo
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No hay notificaciones</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <Badge 
                              variant={notification.type === 'milwaukee' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {notification.type === 'milwaukee' ? 'Milwaukee' : 'Tracking'}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                          </div>
                          
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            Lista {notification.listaId}
                          </p>
                          
                          <p className="text-xs text-gray-600 mb-2">
                            {notification.oldStatus} → {notification.newStatus}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              Fuente: {notification.source}
                            </span>
                            
                            <div className="flex gap-1">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}
                              
                              <Link href="/loma-dashboard/lista-garantias">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => setIsOpen(false)}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}