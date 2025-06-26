
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { PlusCircle, Edit3, Trash2, UserPlus, Users, Eraser, Mail, Loader2, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
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
import {
  type Personal,
  getPersonalList,
  addPersonal,
  updatePersonal,
  deletePersonal,
} from '@/lib/personal-storage';

const usStates = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" }
];

const initialFormState: Omit<Personal, 'id'> = {
  nombre: '',
  apellido: '',
  email: '',
  direccion: '',
  ciudad: '',
  estado: '',
  codigoPostal: '',
  telefono: '',
};

export default function PersonalPage() {
  const { toast } = useToast();
  const [personalList, setPersonalList] = useState<Personal[]>([]);
  const [isLoadingPersonal, setIsLoadingPersonal] = useState(true);
  const [formData, setFormData] = useState<Omit<Personal, 'id'>>(initialFormState);
  const [editingPersonalId, setEditingPersonalId] = useState<string | null>(null);
  const [personalToDelete, setPersonalToDelete] = useState<Personal | null>(null);

  const fetchPersonal = async () => {
    setIsLoadingPersonal(true);
    try {
      const list = await getPersonalList();
      setPersonalList(list);
    } catch (error) {
      console.error("Error fetching personal list:", error);
      toast({ title: "Error", description: "No se pudo cargar la lista de personal.", variant: "destructive" });
    } finally {
      setIsLoadingPersonal(false);
    }
  };

  useEffect(() => {
    fetchPersonal();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const clearForm = () => {
    setFormData(initialFormState);
    setEditingPersonalId(null);
  };

  const validateForm = (): boolean => {
    const requiredFields: (keyof Omit<Personal, 'id'>)[] = ['nombre', 'apellido', 'email', 'direccion', 'ciudad', 'estado', 'codigoPostal', 'telefono'];
    const fieldLabels: Record<keyof Omit<Personal, 'id'>, string> = {
        nombre: 'Nombre',
        apellido: 'Apellido',
        email: 'Email',
        direccion: 'Dirección',
        ciudad: 'Ciudad',
        estado: 'Estado',
        codigoPostal: 'Código Postal',
        telefono: 'Teléfono',
    };

    for (const field of requiredFields) {
        if (!formData[field] || String(formData[field]).trim() === '') {
            toast({ title: "Campo Requerido", description: `El campo "${fieldLabels[field]}" es obligatorio.`, variant: "destructive" });
            return false;
        }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast({ title: "Error de Validación", description: "El formato del Email no es válido.", variant: "destructive" });
      return false;
    }

    const phoneRegex = /^\D*(\d{3})\D*(\d{3})\D*(\d{4})\D*$/;
    if (!phoneRegex.test(formData.telefono.trim())) {
      toast({ title: "Error de Validación", description: "El teléfono debe ser un número válido de 10 dígitos (EE. UU.). Ej: 555-123-4567 o 5551234567.", variant: "destructive" });
      return false;
    }

    if (!/^\d{5}(-\d{4})?$/.test(formData.codigoPostal.trim())) {
        toast({ title: "Error de Validación", description: "El código postal debe ser de 5 dígitos (Ej: 12345) o 5+4 dígitos (Ej: 12345-6789).", variant: "destructive" });
        return false;
    }
    return true;
  };

  const handleFormSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    const personalData = { ...formData };
    personalData.telefono = personalData.telefono.replace(/\D/g, ''); 
    personalData.email = personalData.email.trim();

    let result: Personal | null = null;
    if (editingPersonalId) {
      result = await updatePersonal({ ...personalData, id: editingPersonalId });
      if (result) {
        toast({ title: "Personal Actualizado", description: `${result.nombre} ${result.apellido} actualizado.` });
      }
    } else {
      result = await addPersonal(personalData);
      if (result) {
        toast({ title: "Personal Agregado", description: `${result.nombre} ${result.apellido} agregado a la lista.` });
      }
    }

    if (result) {
      await fetchPersonal();
      clearForm();
    } else {
      toast({ title: "Error de Almacenamiento", description: "No se pudo guardar la información del personal.", variant: "destructive" });
    }
  };

  const handleEditPersonal = (personal: Personal) => {
    setEditingPersonalId(personal.id);
    setFormData({
      nombre: personal.nombre,
      apellido: personal.apellido,
      email: personal.email,
      direccion: personal.direccion,
      ciudad: personal.ciudad,
      estado: personal.estado,
      codigoPostal: personal.codigoPostal,
      telefono: personal.telefono,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const requestDeletePersonal = (personal: Personal) => {
    setPersonalToDelete(personal);
  };

  const confirmDeletePersonal = async () => {
    if (personalToDelete) {
      const success = await deletePersonal(personalToDelete.id);
      setPersonalToDelete(null);

      if (success) {
        await fetchPersonal();
        toast({ title: "Personal Eliminado", description: `${personalToDelete.nombre} ${personalToDelete.apellido} eliminado.` });
        if (editingPersonalId === personalToDelete.id) {
          clearForm();
        }
      } else {
        toast({ title: "Error de Almacenamiento", description: "No se pudo eliminar al miembro del personal.", variant: "destructive" });
        await fetchPersonal(); 
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            {editingPersonalId ? 'Editar Información del Personal' : 'Agregar Nuevo Personal'}
          </CardTitle>
          <CardDescription>
            {editingPersonalId ? 'Modifica los detalles de la persona seleccionada.' : 'Ingresa la información del nuevo miembro del personal o colaborador. Todos los campos son obligatorios.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleFormSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
              <div>
                <Label htmlFor="nombre">Nombre <span className="text-destructive">*</span></Label>
                <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="John" required />
              </div>
              <div>
                <Label htmlFor="apellido">Apellido <span className="text-destructive">*</span></Label>
                <Input id="apellido" name="apellido" value={formData.apellido} onChange={handleInputChange} placeholder="Doe" required />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="john.doe@example.com" required />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="direccion">Dirección <span className="text-destructive">*</span></Label>
                <Input id="direccion" name="direccion" value={formData.direccion} onChange={handleInputChange} placeholder="123 Main St" required />
              </div>
              <div>
                <Label htmlFor="ciudad">Ciudad <span className="text-destructive">*</span></Label>
                <Input id="ciudad" name="ciudad" value={formData.ciudad} onChange={handleInputChange} placeholder="Anytown" required />
              </div>
              <div>
                <Label htmlFor="estado">Estado (USA) <span className="text-destructive">*</span></Label>
                <Select name="estado" value={formData.estado} onValueChange={(value) => handleSelectChange('estado', value)} required>
                  <SelectTrigger id="estado">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {usStates.map(state => (
                      <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="codigoPostal">Código Postal <span className="text-destructive">*</span></Label>
                <Input id="codigoPostal" name="codigoPostal" value={formData.codigoPostal} onChange={handleInputChange} placeholder="12345 o 12345-6789" required />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono <span className="text-destructive">*</span></Label>
                <Input id="telefono" name="telefono" type="tel" value={formData.telefono} onChange={handleInputChange} placeholder="Ej: 555-123-4567" required />
                <p className="text-xs text-muted-foreground mt-1">Ingresa un número de 10 dígitos (EE. UU.).</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t pt-6">
            <Button type="button" variant="outline" onClick={clearForm}>
              <Eraser className="mr-2 h-4 w-4" />
              {editingPersonalId ? 'Cancelar Edición' : 'Limpiar Formulario'}
            </Button>
            <Button type="submit">
              {editingPersonalId ? <><Edit3 className="mr-2 h-4 w-4" /> Guardar Cambios</> : <><PlusCircle className="mr-2 h-4 w-4" /> Agregar Personal</>}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Lista de Personal
          </CardTitle>
          <CardDescription>
            Visualiza, edita o elimina la información de contacto de los miembros del personal registrados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPersonal ? (
             <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Cargando personal...</p>
            </div>
          ) : personalList.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No hay personal registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">ID</TableHead>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personalList.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs align-top">{p.id}</TableCell>
                      <TableCell className="font-medium align-top">{p.nombre} {p.apellido}</TableCell>
                      <TableCell className="align-top max-w-xs truncate" title={p.email}>{p.email}</TableCell>
                      <TableCell className="align-top">{p.telefono ? p.telefono.replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') : '-'}</TableCell>
                      <TableCell className="align-top">{p.ciudad || '-'}</TableCell>
                      <TableCell className="align-top">{p.estado ? (usStates.find(s=>s.value === p.estado)?.label || p.estado) : '-'}</TableCell>
                      <TableCell className="text-right align-top">
                        <Button variant="ghost" size="icon" onClick={() => handleEditPersonal(p)} title="Editar">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => requestDeletePersonal(p)} title="Eliminar" className="text-destructive hover:text-destructive">
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

      {personalToDelete && (
        <AlertDialog open={!!personalToDelete} onOpenChange={(open) => !open && setPersonalToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar Eliminación?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar a {personalToDelete.nombre} {personalToDelete.apellido}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPersonalToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePersonal} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
