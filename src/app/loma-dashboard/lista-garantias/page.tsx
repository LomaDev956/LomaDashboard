
"use client";

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit, Trash2, ListChecks, ShieldCheck, User, PackageSearch, PackageX, Send, Loader2, MoreHorizontal, FileDown, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

import { getHerramientasList, type Herramienta } from '@/lib/herramientas-storage';
import { getPersonalList, type Personal } from '@/lib/personal-storage';
import { 
  getListasGarantia, 
  deleteListaGarantia,
  updateListaGarantiaEstado,
  ESTADOS_GARANTIA,
  type ListaGarantia,
  type ListaGarantiaEstado
} from '@/lib/garantias-storage';


interface ExportData {
    cuenta_email: string;
    numero_serie: string;
    modelo: string;
    descripcion_problema: string;
}

const PrintableWarrantyList = ({ lista, personal, herramientas }: { lista: ListaGarantia; personal?: Personal; herramientas: (Herramienta | undefined)[] }) => {
  return (
    <div className="p-8 font-sans bg-white text-black">
      <header className="flex justify-between items-start border-b-2 border-gray-300 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lista de Garantía de Herramientas</h1>
          <p className="text-lg font-semibold text-gray-700">{lista.nombreLista}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">LOMA Tools</p>
          <p className="text-sm text-gray-600">Reporte de Envío Interno</p>
        </div>
      </header>
      <section className="grid grid-cols-2 gap-x-12 mb-6 text-sm">
        <div>
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 mb-2 pb-1">Detalles del Envío</h2>
          <p><strong className="font-medium text-gray-700">Fecha Creación:</strong> {format(parseISO(lista.fechaCreacion), "dd MMMM yyyy, HH:mm", { locale: es })}</p>
          {lista.fechaEnvio && <p><strong className="font-medium text-gray-700">Fecha Envío:</strong> {format(parseISO(lista.fechaEnvio), "dd MMMM yyyy, HH:mm", { locale: es })}</p>}
          <p><strong className="font-medium text-gray-700">Estado:</strong> {lista.estado}</p>
          <p><strong className="font-medium text-gray-700">Total de Artículos:</strong> {lista.articulos.length}</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 mb-2 pb-1">Personal Asociado</h2>
          {personal ? (
            <>
              <p><strong className="font-medium text-gray-700">Nombre:</strong> {personal.nombre} {personal.apellido}</p>
              <p><strong className="font-medium text-gray-700">Email:</strong> {personal.email}</p>
              <p><strong className="font-medium text-gray-700">Teléfono:</strong> {personal.telefono ? personal.telefono.replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') : '-'}</p>
              <p><strong className="font-medium text-gray-700">Dirección:</strong> {`${personal.direccion}, ${personal.ciudad}, ${personal.estado} ${personal.codigoPostal}`}</p>
            </>
          ) : (
            <p className="text-gray-500">Información no disponible.</p>
          )}
        </div>
      </section>
      {lista.notas && (
        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 mb-2 pb-1">Notas Adicionales</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap p-3 bg-gray-50 border border-gray-200 rounded-md">{lista.notas}</p>
        </section>
      )}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-2">Artículos Incluidos en la Lista</h2>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left text-gray-800">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th scope="col" className="px-4 py-3 w-12 text-center">#</th>
                <th scope="col" className="px-4 py-3">CAT.NO.</th>
                <th scope="col" className="px-4 py-3">Herramienta</th>
                <th scope="col" className="px-4 py-3">Serial Number</th>
                <th scope="col" className="px-4 py-3">Falla Declarada</th>
              </tr>
            </thead>
            <tbody>
              {herramientas.map((tool, index) => (
                <tr key={tool?.id || index} className="bg-white border-b border-gray-200 last:border-b-0">
                  <td className="px-4 py-2 font-medium text-center">{index + 1}</td>
                  <td className="px-4 py-2">{tool?.catNo || 'N/A'}</td>
                  <td className="px-4 py-2 font-medium">{tool?.toolName || 'Desconocida'}</td>
                  <td className="px-4 py-2">{tool?.serialNumber || 'N/A'}</td>
                  <td className="px-4 py-2">{tool?.falla || 'No especificada'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <footer className="text-center mt-10 pt-4 text-xs text-gray-500">
        <p>Reporte generado automáticamente por LOMA Tools el {format(new Date(), "dd/MM/yyyy 'a las' HH:mm:ss")}.</p>
      </footer>
    </div>
  );
};


export default function ListaGarantiasPage() {
  const { toast } = useToast();
  const [listasGarantia, setListasGarantia] = useState<ListaGarantia[]>([]);
  const [allHerramientas, setAllHerramientas] = useState<Herramienta[]>([]);
  const [allPersonal, setAllPersonal] = useState<Personal[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [selectedListForStatus, setSelectedListForStatus] = useState<ListaGarantia | null>(null);
  const [newStatusForSelectedList, setNewStatusForSelectedList] = useState<ListaGarantiaEstado | ''>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const [listToDelete, setListToDelete] = useState<ListaGarantia | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [listToView, setListToView] = useState<ListaGarantia | null>(null);
  const [listToPrint, setListToPrint] = useState<ListaGarantia | null>(null);

  useEffect(() => {
    reloadData();
  }, []);

  useEffect(() => {
    if (listToPrint) {
      const timer = setTimeout(() => {
        window.print();
        setListToPrint(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [listToPrint]);

  const reloadData = async () => {
    setIsLoadingData(true);
    try {
      const [garantias, herramientas, personal] = await Promise.all([
        getListasGarantia(),
        getHerramientasList(),
        getPersonalList()
      ]);
      setListasGarantia(garantias);
      setAllHerramientas(herramientas);
      setAllPersonal(personal);
    } catch (error) {
      console.error("Error loading data for ListaGarantiasPage:", error);
      toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  };

  const getToolDetails = (toolId: string): Herramienta | undefined => {
    return allHerramientas.find(h => h.id === toolId);
  };

  const getPersonalDetails = (personalId: string | null): Personal | undefined => {
    if (!personalId) return undefined;
    return allPersonal.find(p => p.id === personalId);
  };
  
  const getPersonalName = (personalId: string | null): string => {
    const p = getPersonalDetails(personalId);
    return p ? `${p.nombre} ${p.apellido}` : `ID: ${personalId || 'N/A'}`;
  };

  const requestDeleteList = (lista: ListaGarantia) => {
    setListToDelete(lista);
  };

  const confirmDeleteList = async () => {
    if (listToDelete) {
      setIsDeleting(true);
      const success = await deleteListaGarantia(listToDelete.id);
      if (success) {
        toast({ title: "Lista Eliminada", description: `La lista "${listToDelete.nombreLista}" ha sido eliminada.` });
        await reloadData();
      } else {
        toast({ title: "Error al Eliminar", description: "No se pudo eliminar la lista.", variant: "destructive" });
      }
      setListToDelete(null);
      setIsDeleting(false);
    }
  };

  const requestChangeStatus = (lista: ListaGarantia) => {
    setSelectedListForStatus(lista);
    setNewStatusForSelectedList(lista.estado); 
  };

  const confirmChangeStatus = async () => {
    if (selectedListForStatus && newStatusForSelectedList) {
      setIsUpdatingStatus(true);
      const success = await updateListaGarantiaEstado(selectedListForStatus.id, newStatusForSelectedList as ListaGarantiaEstado);
      if (success) {
        toast({ title: "Estado Actualizado", description: `El estado de la lista "${selectedListForStatus.nombreLista}" es ahora "${newStatusForSelectedList}".` });
        await reloadData();
      } else {
        toast({ title: "Error al Actualizar", description: "No se pudo actualizar el estado de la lista.", variant: "destructive" });
      }
      setSelectedListForStatus(null);
      setNewStatusForSelectedList('');
      setIsUpdatingStatus(false);
    }
  };

  const handlePrintList = (lista: ListaGarantia) => {
    setListToPrint(lista);
  };
  
  const getEstadoBadgeColor = (estado: ListaGarantiaEstado) => {
    switch (estado) {
      case 'En Preparación': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200';
      case 'Enviada': return 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200';
      case 'En Proceso': return 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200';
      case 'Finalizada con Devoluciones': return 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200';
      case 'Cancelada': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const prepareExportData = (lista: ListaGarantia): ExportData[] => {
    const personal = getPersonalDetails(lista.personalId);
    if (!personal) {
        toast({ title: "Error de Exportación", description: "No se encontró el personal asociado a la lista.", variant: "destructive" });
        return [];
    }
    
    return lista.articulos.map(articulo => {
        const tool = getToolDetails(articulo.herramientaId);
        return {
            cuenta_email: personal.email,
            numero_serie: tool?.serialNumber || 'N/A',
            modelo: tool?.catNo || 'N/A',
            descripcion_problema: tool?.falla || 'No especificada',
        };
    }).filter(item => item !== null) as ExportData[];
  };

  const handleExportCSV = (lista: ListaGarantia) => {
    const dataToExport = prepareExportData(lista);
    if (dataToExport.length === 0) return;

    const headers = "cuenta_email,numero_serie,modelo,descripcion_problema";
    const csvContent = [
        headers,
        ...dataToExport.map(row => `${row.cuenta_email},${row.numero_serie},${row.modelo},"${row.descripcion_problema.replace(/"/g, '""')}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `herramientas_${lista.nombreLista}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Exportación CSV", description: `Se ha descargado el archivo para la lista ${lista.nombreLista}.`});
  };

  const handleExportXLSX = (lista: ListaGarantia) => {
    const dataToExport = prepareExportData(lista);
    if (dataToExport.length === 0) return;
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Herramientas");
    XLSX.writeFile(workbook, `herramientas_${lista.nombreLista}.xlsx`);
    toast({ title: "Exportación XLSX", description: `Se ha descargado el archivo para la lista ${lista.nombreLista}.`});
  };

  const handleExportPDF = (lista: ListaGarantia) => {
    const dataToExport = prepareExportData(lista);
    if (dataToExport.length === 0) return;
    
    const doc = new jsPDF();
    const personal = getPersonalDetails(lista.personalId);

    doc.setFontSize(18);
    doc.text(`Lista de Garantía: ${lista.nombreLista}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Personal: ${personal ? `${personal.nombre} ${personal.apellido}` : 'N/A'}`, 14, 30);
    doc.text(`Fecha Creación: ${format(parseISO(lista.fechaCreacion), 'P p', { locale: es })}`, 14, 36);

    (doc as any).autoTable({
        startY: 45,
        head: [['Modelo (CAT.NO.)', 'Número de Serie', 'Descripción del Problema']],
        body: dataToExport.map(row => [row.modelo, row.numero_serie, row.descripcion_problema]),
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] }, // Midnight Blue
    });

    doc.save(`herramientas_${lista.nombreLista}.pdf`);
    toast({ title: "Exportación PDF", description: `Se ha descargado el archivo para la lista ${lista.nombreLista}.`});
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando listas de garantías...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Listas de Garantías Enviadas
          </CardTitle>
          <CardDescription>
            Visualiza y gestiona el estado de las listas de garantías que has creado. Las listas se ordenan por fecha de creación (más recientes primero).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listasGarantia.length === 0 ? (
            <div className="text-center py-10 border rounded-md bg-muted/30">
              <PackageX className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-lg font-medium">No hay listas de garantía creadas.</p>
              <p className="text-sm text-muted-foreground mt-1">Puedes crear una nueva lista desde la sección "Crear Lista Garantía".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Creada</TableHead>
                    <TableHead>Enviada</TableHead>
                    <TableHead>Personal</TableHead>
                    <TableHead className="text-center">Artículos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listasGarantia.map((lista) => (
                    <TableRow key={lista.id}>
                      <TableCell className="font-medium">{lista.nombreLista}</TableCell>
                      <TableCell>{format(parseISO(lista.fechaCreacion), "dd/MM/yy HH:mm", { locale: es })}</TableCell>
                      <TableCell>{lista.fechaEnvio ? format(parseISO(lista.fechaEnvio), "dd/MM/yy HH:mm", { locale: es }) : '-'}</TableCell>
                      <TableCell className="max-w-xs truncate" title={getPersonalName(lista.personalId)}>{getPersonalName(lista.personalId)}</TableCell>
                      <TableCell className="text-center">{lista.articulos.length}</TableCell>
                      <TableCell>
                        <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap", getEstadoBadgeColor(lista.estado))}>
                          {lista.estado}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setListToView(lista)}>
                                <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => requestChangeStatus(lista)}>
                                <Edit className="mr-2 h-4 w-4" /> Cambiar Estado
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handlePrintList(lista)}>
                                <Printer className="mr-2 h-4 w-4" /> Imprimir Lista
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleExportCSV(lista)}>
                                <FileDown className="mr-2 h-4 w-4" /> Exportar a CSV
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleExportXLSX(lista)}>
                                <FileDown className="mr-2 h-4 w-4" /> Exportar a XLSX
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleExportPDF(lista)}>
                                <FileDown className="mr-2 h-4 w-4" /> Exportar a PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => requestDeleteList(lista)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Lista
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {listToPrint && (
        <div className="printable-area">
            <PrintableWarrantyList
                lista={listToPrint}
                personal={getPersonalDetails(listToPrint.personalId)}
                herramientas={listToPrint.articulos.map(a => getToolDetails(a.herramientaId))}
            />
        </div>
      )}
      {listToView && (
        <Dialog open={!!listToView} onOpenChange={(open) => !open && setListToView(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PackageSearch className="h-5 w-5"/>
                Detalles de Lista: {listToView.nombreLista}
              </DialogTitle>
              <DialogDescription>
                Creada: {format(parseISO(listToView.fechaCreacion), "PPPp", { locale: es })} por {getPersonalName(listToView.personalId)}
                <br/>Estado: {listToView.estado}
                {listToView.fechaEnvio && ` | Enviada: ${format(parseISO(listToView.fechaEnvio), "PPPp", { locale: es })}`}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
              <h4 className="font-semibold text-md mt-2">Artículos Incluidos ({listToView.articulos.length}):</h4>
              {listToView.articulos.map((articulo, index) => {
                const tool = getToolDetails(articulo.herramientaId);
                return (
                  <Card key={index} className="p-3 bg-muted/40">
                    <div className="flex gap-3">
                      {tool?.fotos && tool.fotos.length > 0 && (
                        <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                          <Image src={tool.fotos[0].url} alt={tool.fotos[0].name || 'Foto herramienta'} layout="fill" objectFit="cover" data-ai-hint="tool image"/>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{tool?.toolName || 'Herramienta Desconocida'}</p>
                        <p className="text-xs text-muted-foreground">CAT.NO: {tool?.catNo || 'N/A'} | S/N: {tool?.serialNumber || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Falla: {tool?.falla || 'No especificada'}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {listToView.notas && (
                <div className="mt-3">
                    <h4 className="font-semibold text-md">Notas Adicionales:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-2 rounded-md">{listToView.notas}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cerrar</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedListForStatus && (
        <Dialog open={!!selectedListForStatus} onOpenChange={(open) => !open && setSelectedListForStatus(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5"/>Cambiar Estado de Lista: {selectedListForStatus.nombreLista}</DialogTitle>
              <DialogDescription>Selecciona el nuevo estado para la lista.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={newStatusForSelectedList} onValueChange={(value) => setNewStatusForSelectedList(value as ListaGarantiaEstado)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_GARANTIA.map(estado => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedListForStatus(null)} disabled={isUpdatingStatus}>Cancelar</Button>
              <Button onClick={confirmChangeStatus} disabled={isUpdatingStatus || !newStatusForSelectedList || newStatusForSelectedList === selectedListForStatus.estado}>
                {isUpdatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {listToDelete && (
        <AlertDialog open={!!listToDelete} onOpenChange={(open) => !open && setListToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar Eliminación?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar la lista de garantía "{listToDelete.nombreLista}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setListToDelete(null)} disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteList} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
