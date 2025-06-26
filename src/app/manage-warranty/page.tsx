
"use client";

import Link from 'next/link';
import { useState, useEffect, type FormEvent } from 'react';
import { AppHeader } from '@/components/camclick/AppHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit3, Trash2, BookOpenCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getCustomWarrantyRules,
  addCustomWarrantyRule,
  updateCustomWarrantyRule,
  deleteCustomWarrantyRule,
  type WarrantyRule
} from '@/lib/warranty-rules-storage';
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
import { cn } from '@/lib/utils';


export default function ManageWarrantyPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<WarrantyRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [catNoInput, setCatNoInput] = useState('');
  const [yearsInput, setYearsInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [isLifetimeInput, setIsLifetimeInput] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<WarrantyRule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRules = async () => {
    setIsLoadingRules(true);
    try {
      const fetchedRules = await getCustomWarrantyRules();
      setRules(fetchedRules);
    } catch (error) {
      console.error("Error fetching custom warranty rules:", error);
      toast({ title: "Error", description: "No se pudieron cargar las reglas personalizadas.", variant: "destructive" });
    } finally {
      setIsLoadingRules(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const clearForm = () => {
    setCatNoInput('');
    setYearsInput('');
    setDescriptionInput('');
    setIsLifetimeInput(false);
    setEditingRuleId(null);
  };

  const handleFormSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!catNoInput.trim()) {
      toast({ title: "Error", description: "El CAT.NO. es obligatorio.", variant: "destructive" });
      return;
    }
    if (!isLifetimeInput && !yearsInput.trim()) {
      toast({ title: "Error", description: "Los años de garantía son obligatorios si no es vitalicia.", variant: "destructive" });
      return;
    }
    if (!isLifetimeInput && (isNaN(parseInt(yearsInput)) || parseInt(yearsInput) < 0)) {
        toast({ title: "Error", description: "Los años de garantía deben ser un número positivo.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    const ruleData: Omit<WarrantyRule, 'id'> = {
      catNo: catNoInput.trim().toUpperCase(),
      years: isLifetimeInput ? null : parseInt(yearsInput),
      description: descriptionInput.trim() || (isLifetimeInput ? "Garantía Vitalicia (Personalizada)" : `${parseInt(yearsInput)} Años (Personalizada)`),
      isLifetime: isLifetimeInput,
    };

    let success = false;
    if (editingRuleId) {
      success = await updateCustomWarrantyRule({ ...ruleData, id: editingRuleId });
      if (success) {
        toast({ title: "Regla Actualizada", description: `Regla para CAT.NO. ${ruleData.catNo} actualizada.` });
      }
    } else {
      success = await addCustomWarrantyRule(ruleData);
      if (success) {
        toast({ title: "Regla Agregada", description: `Nueva regla para CAT.NO. ${ruleData.catNo} agregada.` });
      }
    }

    if (success) {
      await fetchRules();
      clearForm();
    } else {
       toast({ title: "Error al Guardar", description: "No se pudo guardar la regla de garantía.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleEditRule = (rule: WarrantyRule) => {
    setEditingRuleId(rule.id);
    setCatNoInput(rule.catNo);
    setYearsInput(rule.isLifetime || rule.years === null ? '' : String(rule.years));
    setDescriptionInput(rule.description);
    setIsLifetimeInput(rule.isLifetime || false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const requestDeleteRule = (rule: WarrantyRule) => {
    setRuleToDelete(rule);
  };

  const confirmDeleteRule = async () => {
    if (ruleToDelete) {
      setIsSubmitting(true); // Use submitting state for delete as well
      const success = await deleteCustomWarrantyRule(ruleToDelete.id);
      if (success) {
        toast({ title: "Regla Eliminada", description: `Regla para CAT.NO. ${ruleToDelete.catNo} eliminada.` });
        await fetchRules();
         if (editingRuleId === ruleToDelete.id) {
           clearForm();
         }
      } else {
        toast({ title: "Error al Eliminar", description: "No se pudo eliminar la regla.", variant: "destructive" });
      }
      setRuleToDelete(null);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader 
        title="LomaTools" 
        icon={<BookOpenCheck className="h-8 w-8 text-primary" />}
        homePath="/loma-dashboard" 
      />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="mb-6">
          <Link href="/loma-dashboard" passHref> 
            <Button variant="outline" size="sm" className="hover:bg-accent hover:text-accent-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>

        <Card className="w-full max-w-2xl mx-auto shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">
              {editingRuleId ? 'Editar Regla de Garantía' : 'Agregar Nueva Regla de Garantía'}
            </CardTitle>
            <CardDescription>
              {editingRuleId ? 'Modifica los detalles de la regla seleccionada.' : 'Añade tus propias reglas de garantía personalizadas por CAT.NO.'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleFormSubmit}>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label htmlFor="catNo">CAT.NO. <span className="text-destructive">*</span></Label>
                <Input 
                  id="catNo" 
                  value={catNoInput} 
                  onChange={(e) => setCatNoInput(e.target.value.toUpperCase())}
                  placeholder="Ej: 2767-20" 
                  required 
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isLifetime" 
                  checked={isLifetimeInput} 
                  onCheckedChange={(checked) => setIsLifetimeInput(Boolean(checked))}
                  disabled={isSubmitting}
                />
                <Label htmlFor="isLifetime" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  ¿Garantía Vitalicia?
                </Label>
              </div>
              {!isLifetimeInput && (
                <div>
                  <Label htmlFor="years">Años de Garantía <span className="text-destructive">*</span></Label>
                  <Input 
                    id="years" 
                    type="number" 
                    value={yearsInput} 
                    onChange={(e) => setYearsInput(e.target.value)} 
                    placeholder="Ej: 3" 
                    min="0"
                    required={!isLifetimeInput}
                    disabled={isSubmitting || isLifetimeInput}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="description">Descripción (Opcional)</Label>
                <Textarea 
                  id="description" 
                  value={descriptionInput} 
                  onChange={(e) => setDescriptionInput(e.target.value)} 
                  placeholder="Ej: Taladro M18 FUEL (Garantía Personalizada)" 
                  disabled={isSubmitting}
                />
                 <p className="text-xs text-muted-foreground mt-1">
                   Si se deja en blanco, se generará una descripción basada en los años o si es vitalicia.
                 </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              {editingRuleId && (
                <Button type="button" variant="outline" onClick={clearForm} disabled={isSubmitting}>Cancelar Edición</Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingRuleId ? 'Actualizar Regla' : 'Agregar Regla'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="w-full max-w-4xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline">Reglas de Garantía Personalizadas</CardTitle>
            <CardDescription>
              Estas reglas tienen prioridad sobre las reglas codificadas en la aplicación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRules ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Cargando reglas...</p>
              </div>
            ) : rules.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay reglas personalizadas definidas.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CAT.NO.</TableHead>
                      <TableHead>Años/Estado</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.catNo}</TableCell>
                        <TableCell>{rule.isLifetime ? "Vitalicia" : (rule.years !== null ? `${rule.years} años` : "N/A")}</TableCell>
                        <TableCell className="max-w-xs truncate" title={rule.description}>{rule.description}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditRule(rule)} title="Editar" disabled={isSubmitting}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => requestDeleteRule(rule)} title="Eliminar" className="text-destructive hover:text-destructive" disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" />
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
      </main>

      {ruleToDelete && (
        <AlertDialog open={!!ruleToDelete} onOpenChange={(open) => !open && setRuleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar Eliminación?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar la regla para CAT.NO. "{ruleToDelete.catNo}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRuleToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteRule} className={cn(buttonVariants({ variant: "destructive" }))} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
