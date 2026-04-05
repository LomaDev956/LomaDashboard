
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Camera, AlertTriangle, ArrowLeft, ArrowDown, ArrowUp, PackagePlus, ListPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { getHerramientasList, getHerramientaById, type Herramienta, type HerramientaFoto } from '@/lib/herramientas-storage';
import { isHerramientaInActiveList } from '@/lib/garantias-storage';
import { getCustomWarrantyRules } from '@/lib/warranty-rules-storage';
import { estimateWarrantyFromSerialNumber } from '@/lib/warranty-utils';

export default function PendientesPage() {
  const { toast } = useToast();
  const [pendingTools, setPendingTools] = useState<Herramienta[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [toolToViewPhotos, setToolToViewPhotos] = useState<Herramienta | null>(null);
  const [imageToMaximize, setImageToMaximize] = useState<HerramientaFoto | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Herramienta; direction: 'ascending' | 'descending' }>({ key: 'catNo', direction: 'ascending' });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const herramientasData = await getHerramientasList();
        const rules = await getCustomWarrantyRules();
        const today = new Date();
        const EXPIRATION_THRESHOLD_DAYS = 30;

        const toolsForWarranty = await Promise.all(herramientasData.map(async h => {
          if (h.estado !== 'Requiere Reparación') return null;

          const isInActiveList = await isHerramientaInActiveList(h.id);
          if (isInActiveList) return null;

          let isExpiringSoon = false;
          let expiresIn: string | undefined = undefined;

          const warrantyInfo = estimateWarrantyFromSerialNumber(h.serialNumber, h.toolName, h.catNo, rules, h.fechaVencimientoGarantia);
          if (warrantyInfo.status === 'Activa' && warrantyInfo.expirationDate) {
              const expirationDate = parseISO(warrantyInfo.expirationDate);
              const daysUntilExpiration = differenceInDays(expirationDate, today);
              if (daysUntilExpiration >= 0 && daysUntilExpiration <= EXPIRATION_THRESHOLD_DAYS) {
                  isExpiringSoon = true;
                  expiresIn = formatDistanceToNow(expirationDate, { addSuffix: true, locale: es });
              }
          }
          
          return {
            ...h,
            isExpiringSoon,
            expiresIn,
          };
        }));

        setPendingTools(toolsForWarranty.filter((h): h is Herramienta => h !== null));
      } catch (error) {
        console.error("Error fetching data for PendientesPage:", error);
        toast({ title: "Error", description: "No se pudieron cargar las herramientas pendientes.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleClosePhotoModal = () => {
    setToolToViewPhotos(null);
    setImageToMaximize(null);
  };

  const openToolPhotos = async (h: Herramienta) => {
    const full = await getHerramientaById(h.id);
    setToolToViewPhotos(full ?? h);
  };

  const requestSort = (key: keyof Herramienta) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedPendingTools = useMemo(() => {
    let sortableItems = [...pendingTools];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [pendingTools, sortConfig]);

  const SortableHeader = ({ sortKey, label }: { sortKey: keyof Herramienta; label: string }) => (
    <Button variant="ghost" onClick={() => requestSort(sortKey)} className="pl-0 pr-2 hover:bg-transparent -ml-3">
      {label}
      {sortConfig.key === sortKey ? (
        sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
      ) : null}
    </Button>
  );

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando herramientas pendientes...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-6 w-6 text-primary" />
              Herramientas Pendientes de Envío a Garantía
            </CardTitle>
            <CardDescription>
              Esta es una lista de todas las herramientas marcadas como "Requiere Reparación" que aún no han sido incluidas en una lista de garantía activa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTools.length === 0 ? (
              <Alert variant="default" className="text-center py-8">
                  <PackagePlus className="h-10 w-10 mx-auto mb-3 text-green-500" />
                  <AlertTitle className="text-lg font-semibold">¡Todo al Día!</AlertTitle>
                  <AlertDescription className="mt-2">
                    No hay herramientas pendientes de enviar a garantía en este momento.
                    <br/>
                    Puedes marcar herramientas como "Requiere Reparación" en la sección de 'Herramientas'.
                  </AlertDescription>
                  <Link href="/loma-dashboard/garantias" passHref>
                    <Button className="mt-4">
                      <ListPlus className="mr-2 h-4 w-4"/>
                      Ir a Crear Lista de Garantía
                    </Button>
                  </Link>
              </Alert>
            ) : (
              <div className="border rounded-md max-h-[70vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><SortableHeader sortKey="catNo" label="CAT.NO." /></TableHead>
                      <TableHead><SortableHeader sortKey="toolName" label="Herramienta" /></TableHead>
                      <TableHead><SortableHeader sortKey="serialNumber" label="Serial Number" /></TableHead>
                      <TableHead>Falla Declarada</TableHead>
                      <TableHead className="text-center">Fotos</TableHead>
                      <TableHead className="text-center">Garantía</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPendingTools.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell>{h.catNo}</TableCell>
                        <TableCell>{h.toolName}</TableCell>
                        <TableCell>{h.serialNumber || 'N/A'}</TableCell>
                        <TableCell className="max-w-xs truncate" title={h.falla || undefined}>{h.falla || "N/A"}</TableCell>
                        <TableCell className="text-center">
                          <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openToolPhotos(h)}
                              title="Ver fotos (se cargan al abrir)"
                          >
                              <Camera className="h-4 w-4" />
                              <span className="ml-1 text-xs">({h.fotos?.length || 0})</span>
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          {h.isExpiringSoon && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Garantía vence {h.expiresIn}.</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {toolToViewPhotos && (
        <Dialog open={!!toolToViewPhotos} onOpenChange={(open) => !open && handleClosePhotoModal()}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Fotos de: {toolToViewPhotos.toolName}</DialogTitle>
                    <DialogDescription>
                        CAT.NO: {toolToViewPhotos.catNo} | S/N: {toolToViewPhotos.serialNumber || 'N/A'}
                    </DialogDescription>
                </DialogHeader>
                
                {imageToMaximize ? (
                    <div className="py-4">
                        <div className="relative aspect-video w-full">
                            <Image
                                src={imageToMaximize.url}
                                alt={imageToMaximize.name || 'Foto maximizada'}
                                layout="fill"
                                objectFit="contain"
                                className="rounded-md"
                                data-ai-hint="tool image large"
                                style={{ transform: `rotate(${imageToMaximize.rotation || 0}deg)` }}
                            />
                        </div>
                    </div>
                ) : toolToViewPhotos.fotos && toolToViewPhotos.fotos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 max-h-[60vh] overflow-y-auto">
                        {toolToViewPhotos.fotos.map((foto) => (
                            <div key={foto.id} className="relative aspect-square group cursor-pointer" onClick={() => setImageToMaximize(foto)}>
                                <Image
                                    src={foto.url}
                                    alt={foto.name || 'Foto de herramienta'}
                                    layout="fill"
                                    objectFit="cover"
                                    className="rounded-md"
                                    data-ai-hint="tool image"
                                    style={{ transform: `rotate(${foto.rotation || 0}deg)` }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <span className="text-white text-xs font-bold">Ver</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="py-4 text-muted-foreground">Esta herramienta no tiene fotos.</p>
                )}
                
                <DialogFooter>
                    {imageToMaximize && (
                        <Button variant="secondary" onClick={() => setImageToMaximize(null)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver a la Galería
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleClosePhotoModal}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
}
