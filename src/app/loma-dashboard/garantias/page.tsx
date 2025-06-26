
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, User, ListPlus, Info, PackagePlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { getHerramientasList, type Herramienta } from '@/lib/herramientas-storage';
import { getPersonalList, type Personal } from '@/lib/personal-storage';
import { 
  addListaGarantia, 
  generateListaGarantiaId,
  generateListaGarantiaNombre,
  isHerramientaInActiveList,
  countListasByPersonal,
  type ListaGarantia,
  type ArticuloGarantia
} from '@/lib/garantias-storage';

interface SelectableHerramienta extends Herramienta {
  isSelected: boolean;
  isInActiveList: boolean;
}

export default function GarantiasPage() {
  const { toast } = useToast();
  const [allHerramientas, setAllHerramientas] = useState<SelectableHerramienta[]>([]);
  const [availableHerramientas, setAvailableHerramientas] = useState<SelectableHerramienta[]>([]);
  const [personalList, setPersonalList] = useState<Personal[]>([]);
  
  const [selectedHerramientaIds, setSelectedHerramientaIds] = useState<Set<string>>(new Set());
  const [selectedPersonalId, setSelectedPersonalId] = useState<string>('');
  const [notasLista, setNotasLista] = useState<string>('');

  const [personalListCount, setPersonalListCount] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [herramientasData, personalData] = await Promise.all([
        getHerramientasList(),
        getPersonalList()
      ]);

      const herramientasConEstado = await Promise.all(herramientasData.map(async h => ({
        ...h,
        isSelected: false,
        isInActiveList: await isHerramientaInActiveList(h.id) 
      })));
      
      setAllHerramientas(herramientasConEstado);
      setAvailableHerramientas(
        herramientasConEstado.filter(h => h.estado === 'Requiere Reparación' && !h.isInActiveList)
      );
      setPersonalList(personalData);

    } catch (error) {
      console.error("Error fetching initial data for GarantiasPage:", error);
      toast({ title: "Error", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const updatePersonalCount = async () => {
      if (selectedPersonalId) {
        setPersonalListCount(await countListasByPersonal(selectedPersonalId));
      } else {
        setPersonalListCount(0);
      }
    };
    updatePersonalCount();
  }, [selectedPersonalId]);

  const handleToolSelectionChange = (herramientaId: string, checked: boolean) => {
    setSelectedHerramientaIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(herramientaId);
      } else {
        newSet.delete(herramientaId);
      }
      return newSet;
    });
    setAvailableHerramientas(prev => 
      prev.map(h => h.id === herramientaId ? { ...h, isSelected: checked } : h)
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (selectedHerramientaIds.size === 0) {
      toast({ title: "Error", description: "Debes seleccionar al menos una herramienta.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (!selectedPersonalId) {
      toast({ title: "Error", description: "Debes seleccionar un miembro del personal.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const articulosGarantia: ArticuloGarantia[] = Array.from(selectedHerramientaIds).map(id => ({ herramientaId: id }));
    
    try {
      const nuevoNombreLista = await generateListaGarantiaNombre();

      const nuevaListaData: Omit<ListaGarantia, 'id' | 'nombreLista'> & { nombreLista: string; id: string } = {
        id: generateListaGarantiaId(),
        nombreLista: nuevoNombreLista,
        articulos: articulosGarantia,
        personalId: selectedPersonalId,
        fechaCreacion: new Date().toISOString(),
        estado: "En Preparación",
        notas: notasLista.trim() || undefined,
      };

      const success = await addListaGarantia(nuevaListaData);

      if (success) {
        toast({ title: "Lista de Garantía Creada", description: `La lista "${nuevaListaData.nombreLista}" ha sido creada con ${nuevaListaData.articulos.length} artículo(s).` });
        setSelectedHerramientaIds(new Set());
        setSelectedPersonalId('');
        setNotasLista('');
        await fetchData(); // Re-fetch all data including available tools
      } else {
         toast({ title: "Error al Crear Lista", description: "No se pudo guardar la lista de garantía.", variant: "destructive" });
      }
    } catch (error) {
        console.error("Error al generar nombre o crear lista:", error);
        toast({ title: "Error", description: "Ocurrió un problema al crear la lista.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const getToolName = (toolId: string): string => {
    const tool = allHerramientas.find(h => h.id === toolId);
    return tool ? `${tool.toolName} (S/N: ${tool.serialNumber || 'N/A'})` : 'Herramienta Desconocida';
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListPlus className="h-6 w-6 text-primary" />
            Crear Nueva Lista de Garantía
          </CardTitle>
          <CardDescription>
            Selecciona las herramientas que necesitan ir a garantía, asócialas con un miembro del personal y crea la lista. El nombre de la lista se generará automáticamente.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-8">
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                1. Seleccionar Herramientas para Garantía
              </h3>
              {availableHerramientas.length === 0 ? (
                 <Alert variant="default">
                    <PackagePlus className="h-4 w-4" />
                    <AlertTitle>No Hay Herramientas Disponibles</AlertTitle>
                    <AlertDescription>
                      No hay herramientas marcadas como "Requiere Reparación" que no estén ya en una lista de garantía activa. 
                      Asegúrate de agregar herramientas y marcar su estado correctamente en la sección 'Herramientas'.
                    </AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-md max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>CAT.NO.</TableHead>
                        <TableHead>Herramienta</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Falla Declarada</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableHerramientas.map((h) => (
                        <TableRow key={h.id} className={cn(h.isSelected && "bg-muted/50")}>
                          <TableCell>
                            <Checkbox
                              id={`tool-${h.id}`}
                              checked={h.isSelected}
                              onCheckedChange={(checked) => handleToolSelectionChange(h.id, Boolean(checked))}
                              aria-label={`Seleccionar ${h.toolName}`}
                            />
                          </TableCell>
                          <TableCell>{h.catNo}</TableCell>
                          <TableCell>{h.toolName}</TableCell>
                          <TableCell>{h.serialNumber || "N/A"}</TableCell>
                          <TableCell className="max-w-xs truncate" title={h.falla || undefined}>{h.falla || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                2. Detalles Adicionales y Personal Asociado
              </h3>
              <div>
                <Label htmlFor="selectedPersonalId">Asociar con Personal <span className="text-destructive">*</span></Label>
                <Select value={selectedPersonalId} onValueChange={setSelectedPersonalId} required>
                  <SelectTrigger id="selectedPersonalId">
                    <SelectValue placeholder="Selecciona un miembro del personal" />
                  </SelectTrigger>
                  <SelectContent>
                    {personalList.length === 0 && <SelectItem value="no-personal" disabled>No hay personal registrado</SelectItem>}
                    {personalList.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre} {p.apellido} (ID: {p.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {personalListCount > 0 && selectedPersonalId && (
                <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
                  <Info className="h-4 w-4 !text-blue-600 dark:!text-blue-400" />
                  <AlertTitle>Información del Personal</AlertTitle>
                  <AlertDescription>
                    Este miembro del personal ya está asociado con {personalListCount} lista(s) de garantía. Esto es solo un aviso.
                  </AlertDescription>
                </Alert>
              )}
               <div>
                <Label htmlFor="notasLista">Notas Adicionales (Opcional)</Label>
                <Textarea 
                  id="notasLista" 
                  value={notasLista} 
                  onChange={(e) => setNotasLista(e.target.value)} 
                  placeholder="Cualquier nota relevante para esta lista de envío..." 
                  rows={3}
                />
              </div>
            </section>

             {selectedHerramientaIds.size > 0 && (
                <section className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-3">Resumen de Herramientas Seleccionadas</h3>
                     <div className="max-h-60 overflow-y-auto space-y-2 p-2 border rounded-md bg-muted/30">
                        {Array.from(selectedHerramientaIds).map(id => (
                            <div key={id} className="text-sm p-1.5 rounded bg-background shadow-sm">
                                {getToolName(id)}
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Total de herramientas seleccionadas: {selectedHerramientaIds.size}</p>
                </section>
            )}
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-6">
            <Button type="submit" size="lg" disabled={isSubmitting || isLoadingData || selectedHerramientaIds.size === 0 || !selectedPersonalId}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ListPlus className="mr-2 h-5 w-5" />}
              Crear Lista de Garantía
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
