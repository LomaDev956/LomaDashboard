
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, ShoppingCart, Search, Edit } from 'lucide-react';
import { getHerramientasList, updateHerramienta, type Herramienta } from '@/lib/herramientas-storage';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function VendidosPage() {
  const { toast } = useToast();
  const [soldItems, setSoldItems] = useState<Herramienta[]>([]);
  const [filteredItems, setFilteredItems] = useState<Herramienta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [toolToEditStatus, setToolToEditStatus] = useState<Herramienta | null>(null);
  const [newStatus, setNewStatus] = useState<Herramienta['estado'] | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSoldItems = async () => {
    setIsLoading(true);
    try {
      const allTools = await getHerramientasList();
      const itemsSold = allTools
        .filter(tool => tool.estado === 'Vendido')
        .sort((a, b) => {
          const dateA = a.fechaVenta ? parseISO(a.fechaVenta).getTime() : 0;
          const dateB = b.fechaVenta ? parseISO(b.fechaVenta).getTime() : 0;
          return dateB - dateA;
        });
      setSoldItems(itemsSold);
      setFilteredItems(itemsSold);
    } catch (error) {
      console.error("Error fetching sold items:", error);
      toast({ title: "Error", description: "No se pudieron cargar los artículos vendidos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSoldItems();
  }, [toast]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = soldItems.filter(item => {
      return (
        item.toolName.toLowerCase().includes(lowercasedFilter) ||
        item.catNo.toLowerCase().includes(lowercasedFilter) ||
        item.serialNumber?.toLowerCase().includes(lowercasedFilter)
      );
    });
    setFilteredItems(filtered);
  }, [searchTerm, soldItems]);
  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Fecha no registrada';
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, "dd MMMM yyyy", { locale: es });
      }
    } catch (e) {}
    return 'Fecha inválida';
  };

  const handleStatusChange = async () => {
    if (!toolToEditStatus || !newStatus) {
        toast({ title: "Error", description: "Debes seleccionar un nuevo estado.", variant: "destructive" });
        return;
    }
    if (newStatus === 'Vendido') {
        toast({ title: "Estado Inválido", description: "La herramienta ya está marcada como 'Vendido'.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
        const updatedTool = {
            ...toolToEditStatus,
            estado: newStatus as 'Operativa' | 'Requiere Reparación',
            fechaVenta: null, // Remove sale date on status reversal
        };

        const success = await updateHerramienta(updatedTool);

        if (success) {
            toast({
                title: "Estado Actualizado",
                description: `La herramienta '${updatedTool.toolName}' ahora está en estado '${newStatus}'.`,
            });
            await fetchSoldItems(); // Refreshes the list of sold items
            setToolToEditStatus(null);
            setNewStatus('');
        } else {
            throw new Error('No se pudo actualizar la herramienta en la base de datos.');
        }

    } catch (error) {
        toast({
            title: "Error al Actualizar",
            description: error instanceof Error ? error.message : "Ocurrió un error desconocido.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-primary"/>
              Historial de Herramientas Vendidas
          </CardTitle>
          <CardDescription>
            Consulta el registro de todos los artículos que han sido marcados como 'Vendido'.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
              <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder="Buscar por nombre, CAT.NO. o S/N..."
                      className="w-full pl-8 sm:w-[300px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Cargando historial de ventas...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-10 border rounded-md bg-muted/30">
                <p className="text-muted-foreground font-medium">
                  {searchTerm ? 'No se encontraron ventas que coincidan.' : 'Aún no hay herramientas vendidas.'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Puedes vender artículos desde la sección de "Stock".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha de Venta</TableHead>
                    <TableHead>CAT.NO.</TableHead>
                    <TableHead>Nombre Herramienta</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Condición</TableHead>
                    <TableHead>Precio Vendido</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium whitespace-nowrap">{formatDate(item.fechaVenta)}</TableCell>
                      <TableCell>{item.catNo}</TableCell>
                      <TableCell>{item.toolName}</TableCell>
                      <TableCell>{item.serialNumber || 'N/A'}</TableCell>
                      <TableCell>
                          <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap",
                              item.condicion === 'Nueva' ? 'bg-primary text-primary-foreground' :
                              item.condicion === 'Usada (Reparada)' ? 'bg-accent text-accent-foreground' :
                              'bg-secondary text-secondary-foreground'
                          )}>
                              {item.condicion || 'Usada'}
                          </span>
                      </TableCell>
                       <TableCell>
                        {item.precio != null ? `$${item.precio.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Cambiar Estado"
                            onClick={() => {
                                setToolToEditStatus(item);
                                setNewStatus('');
                            }}
                            disabled={isSubmitting}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={!!toolToEditStatus} onOpenChange={(open) => !open && setToolToEditStatus(null)}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Cambiar Estado de Herramienta</DialogTitle>
                <DialogDescription>
                    Revierte el estado de "{toolToEditStatus?.toolName}" al inventario. Esto es útil para devoluciones o garantías.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="new-status">Nuevo Estado</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as Herramienta['estado'])}>
                    <SelectTrigger id="new-status">
                        <SelectValue placeholder="Selecciona el nuevo estado..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Operativa">Operativa (Vuelve a Stock)</SelectItem>
                        <SelectItem value="Requiere Reparación">Requiere Reparación</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setToolToEditStatus(null)} disabled={isSubmitting}>Cancelar</Button>
                <Button onClick={handleStatusChange} disabled={isSubmitting || !newStatus}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Cambio
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
