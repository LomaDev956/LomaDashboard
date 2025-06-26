"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Package, ShoppingCart, Search } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getHerramientasList, type Herramienta } from '@/lib/herramientas-storage';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function StockPage() {
  const { toast } = useToast();
  const [stockItems, setStockItems] = useState<Herramienta[]>([]);
  const [filteredItems, setFilteredItems] = useState<Herramienta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSellingItemId, setIsSellingItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStockItems = async () => {
    setIsLoading(true);
    try {
      const allTools = await getHerramientasList();
      // Items in stock are those that are 'Operativa'
      const availableForSale = allTools.filter(tool => tool.estado === 'Operativa');
      setStockItems(availableForSale);
      setFilteredItems(availableForSale);
    } catch (error) {
      console.error("Error fetching stock items:", error);
      toast({
        title: "Error al Cargar Stock",
        description: "No se pudieron cargar los artículos del inventario.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStockItems();
  }, []);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = stockItems.filter(item => {
      return (
        item.toolName.toLowerCase().includes(lowercasedFilter) ||
        item.catNo.toLowerCase().includes(lowercasedFilter) ||
        item.serialNumber?.toLowerCase().includes(lowercasedFilter)
      );
    });
    setFilteredItems(filtered);
  }, [searchTerm, stockItems]);
  
  const handleSellClick = async (item: Herramienta) => {
    setIsSellingItemId(item.id);
    try {
      const response = await fetch('/api/pos/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [item.id] }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al procesar la venta.');
      }

      toast({
        title: "Venta Registrada",
        description: `Se ha marcado '${item.toolName}' como 'Vendido'.`,
      });
      // Re-fetch stock to remove the sold item from the list
      await fetchStockItems();

    } catch (error) {
       toast({
        title: "Error en la Venta",
        description: error instanceof Error ? error.message : "Ocurrió un error desconocido.",
        variant: "destructive",
      });
    } finally {
       setIsSellingItemId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary"/>
            Gestión de Stock para Venta
        </CardTitle>
        <CardDescription>
          Visualiza los artículos operativos disponibles en el inventario, listos para la venta.
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
            <p className="ml-2 text-muted-foreground">Cargando stock...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-10 border rounded-md bg-muted/30">
              <p className="text-muted-foreground font-medium">
                {searchTerm ? 'No se encontraron artículos que coincidan con tu búsqueda.' : 'No hay artículos operativos en el inventario.'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Agrega herramientas o actualiza su estado en la sección "Herramientas".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CAT.NO.</TableHead>
                  <TableHead>Nombre Herramienta</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Condición</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.catNo}</TableCell>
                    <TableCell>{item.toolName}</TableCell>
                    <TableCell>{item.serialNumber || 'N/A'}</TableCell>
                    <TableCell>
                        <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap",
                            item.condicion === 'Nueva' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300')}>
                            {item.condicion || 'Usada'}
                        </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleSellClick(item)} disabled={isSellingItemId === item.id}>
                        {isSellingItemId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                        Vender
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
  );
}
