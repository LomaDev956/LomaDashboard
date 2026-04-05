
"use client";

import { useState, useEffect, type FormEvent, useRef } from 'react';
import { PlusCircle, Edit3, Trash2, Wrench, Package, Camera as CameraIcon, CalendarDays, Eraser, UploadCloud, ScanSearch, Eye, X, ShieldCheck, AlertTriangle, Loader2, Info, BadgeDollarSign } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isValid, parseISO, formatDistanceStrict } from "date-fns";
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { cn } from '@/lib/utils';

import {
  type Herramienta,
  type HerramientaFoto,
  type HerramientaCondicion,
  getHerramientasList,
  addHerramienta,
  updateHerramienta,
  deleteHerramienta,
  generateHerramientaId,
  dateToIsoString,
  isoStringToDate
} from '@/lib/herramientas-storage';
import { OcrExtractionModal } from '@/components/loma-dashboard/OcrExtractionModal';
import type { BatteryInfoOutput } from '@/ai/flows/extractBatteryInfoFlow';
import { CameraPreviewModal } from '@/components/camclick/CameraPreviewModal';
import { type WarrantyInfo, estimateWarrantyFromSerialNumber, getWarrantyStatusBgColor, determineWarrantyPeriod, getToolNameByCatNo } from '@/lib/warranty-utils';
import { getCustomWarrantyRules, type WarrantyRule } from '@/lib/warranty-rules-storage';
import { saveCatNoKnowledge } from '@/lib/cat-no-knowledge-storage';


const MAX_PHOTO_SIZE_MB = 5;
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;
const MAX_PHOTOS_PER_TOOL = 10;


const initialFormState: Omit<Herramienta, 'id' | 'fechaAgregado' | 'fotos'> & { fotos: File[] } = {
  catNo: '',
  toolName: '',
  serialNumber: '',
  falla: '',
  anosGarantia: '',
  fechaVencimientoGarantia: null,
  fotos: [],
  estado: 'Operativa',
  condicion: 'Nueva',
};

async function dataURLtoFile(dataurl: string, filename: string): Promise<File> {
  const arr = dataurl.split(',');
  if (!arr[0]) throw new Error('Invalid data URL format');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch || !mimeMatch[1]) throw new Error('Could not extract MIME type from data URL');
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}


export default function HerramientasPage() {
  const { toast } = useToast();
  const [herramientasList, setHerramientasList] = useState<Herramienta[]>([]);
  const [isLoadingHerramientas, setIsLoadingHerramientas] = useState(true);
  const [formData, setFormData] = useState<Omit<Herramienta, 'id' | 'fechaAgregado' | 'fotos'> & { fotos: File[], currentFotos: HerramientaFoto[] }>(
    { ...initialFormState, currentFotos: [] }
  );
  const [editingHerramientaId, setEditingHerramientaId] = useState<string | null>(null);
  const [herramientaToDelete, setHerramientaToDelete] = useState<Herramienta | null>(null);
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isToolPhotoCameraModalOpen, setIsToolPhotoCameraModalOpen] = useState(false);
  const [imageToViewInModal, setImageToViewInModal] = useState<string | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [estimatedWarrantyInfo, setEstimatedWarrantyInfo] = useState<WarrantyInfo | null>(null);
  const [isEstimatingWarranty, setIsEstimatingWarranty] = useState<boolean>(false);
  const [customWarrantyRules, setCustomWarrantyRules] = useState<WarrantyRule[]>([]);

  const fetchAllData = async () => {
    setIsLoadingHerramientas(true);
    try {
      const [herramientas, rules] = await Promise.all([
        getHerramientasList(),
        getCustomWarrantyRules()
      ]);
      setHerramientasList(herramientas);
      setCustomWarrantyRules(rules);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
    } finally {
      setIsLoadingHerramientas(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);


  useEffect(() => {
    const estimate = async () => {
      if (formData.serialNumber && formData.serialNumber.trim() !== "") {
        setIsEstimatingWarranty(true);
        setEstimatedWarrantyInfo(null);
        await new Promise(resolve => setTimeout(resolve, 50)); 
        // customWarrantyRules state is used here
        const result = estimateWarrantyFromSerialNumber(
          formData.serialNumber,
          formData.toolName,
          formData.catNo,
          customWarrantyRules 
        );
        setEstimatedWarrantyInfo(result);
        setIsEstimatingWarranty(false);
      } else {
        setEstimatedWarrantyInfo(null);
      }
    };

    if(!isLoadingHerramientas) { // Ensure rules are loaded
        estimate();
    }
  }, [formData.serialNumber, formData.catNo, formData.toolName, customWarrantyRules, isLoadingHerramientas]);

  // Autofill tool name from CAT.NO.
  useEffect(() => {
    if (!formData.catNo || isLoadingHerramientas) {
      return;
    }
    
    const fetchAndSetToolName = async () => {
      const toolNameFound = await getToolNameByCatNo(formData.catNo);
      if (toolNameFound && !formData.toolName) { // Only autofill if the tool name is currently empty
        setFormData(prev => ({ ...prev, toolName: toolNameFound }));
      }
    };

    const handler = setTimeout(() => {
      fetchAndSetToolName();
    }, 500); // Debounce for 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [formData.catNo, formData.toolName, isLoadingHerramientas]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value as Herramienta['estado'] | Herramienta['condicion'] }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, fechaVencimientoGarantia: date ? dateToIsoString(date) : null }));
  };

  const handlePhotoInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const totalPhotos = formData.currentFotos.length + selectedImagePreviews.length + newFiles.length;

      if (totalPhotos > MAX_PHOTOS_PER_TOOL) {
        toast({
          title: "Límite de Fotos Excedido",
          description: `Puedes subir un máximo de ${MAX_PHOTOS_PER_TOOL} fotos por herramienta. Ya tienes ${formData.currentFotos.length + selectedImagePreviews.length}.`,
          variant: "destructive",
        });
        return;
      }

      const validNewFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of newFiles) {
        if (file.size > MAX_PHOTO_SIZE_BYTES) {
          toast({
            title: "Archivo Demasiado Grande",
            description: `La foto "${file.name}" excede el límite de ${MAX_PHOTO_SIZE_MB}MB y no será agregada.`,
            variant: "destructive",
          });
          continue;
        }
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Archivo Inválido",
            description: `"${file.name}" no es una imagen válida y no será agregada.`,
            variant: "destructive",
          });
          continue;
        }
        validNewFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }

      setFormData(prev => ({ ...prev, fotos: [...prev.fotos, ...validNewFiles] }));
      setSelectedImagePreviews(prev => [...prev, ...newPreviews]);
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleToolPhotoCaptured = async (imageDataUrl: string) => {
    setIsToolPhotoCameraModalOpen(false);
    const totalPhotos = formData.currentFotos.length + selectedImagePreviews.length + 1;

    if (totalPhotos > MAX_PHOTOS_PER_TOOL) {
      toast({
        title: "Límite de Fotos Excedido",
        description: `Puedes subir un máximo de ${MAX_PHOTOS_PER_TOOL} fotos por herramienta.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      const filename = `captured_tool_photo_${timestamp}_${randomSuffix}.png`;
      const newFile = await dataURLtoFile(imageDataUrl, filename);

      if (newFile.size > MAX_PHOTO_SIZE_BYTES) {
        toast({
          title: "Foto Capturada Demasiado Grande",
          description: `La foto capturada excede el límite de ${MAX_PHOTO_SIZE_MB}MB y no será agregada.`,
          variant: "destructive",
        });
        return;
      }

      setFormData(prev => ({ ...prev, fotos: [...prev.fotos, newFile] }));
      setSelectedImagePreviews(prev => [...prev, URL.createObjectURL(newFile)]);
      toast({ title: "Foto Capturada Agregada", description: "La foto de la cámara se ha añadido." });
    } catch (error) {
      console.error("Error processing captured photo:", error);
      toast({ title: "Error al Procesar Foto", description: "No se pudo procesar la foto capturada.", variant: "destructive" });
    }
  };

  const removeSelectedPreview = (index: number) => {
    setSelectedImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({ ...prev, fotos: prev.fotos.filter((_, i) => i !== index) }));
  };

  const removeCurrentFoto = (photoId: string) => {
    setFormData(prev => ({ ...prev, currentFotos: prev.currentFotos.filter(f => f.id !== photoId) }));
  };


  const clearForm = () => {
    setFormData({ ...initialFormState, currentFotos: [] });
    setSelectedImagePreviews([]);
    setEditingHerramientaId(null);
    setEstimatedWarrantyInfo(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const validateForm = (): boolean => {
    if (!formData.catNo.trim() || !formData.toolName.trim()) {
      toast({ title: "Error de Validación", description: "CAT.NO. y Nombre de Herramienta son obligatorios.", variant: "destructive" });
      return false;
    }
    if (formData.anosGarantia && isNaN(parseInt(formData.anosGarantia))) {
      toast({ title: "Error de Validación", description: "Años de Garantía debe ser un número.", variant: "destructive" });
      return false;
    }
    if (formData.estado === 'Requiere Reparación' && !formData.falla.trim()) {
        toast({ title: "Error de Validación", description: "Si la herramienta Requiere Reparación, la Falla es obligatoria.", variant: "destructive" });
        return false;
    }
    return true;
  };

  const handleOcrDataExtracted = (data: BatteryInfoOutput) => {
    let fieldsUpdated = false;
    const updatedFormData = { ...formData };

    if (data.area2Text && data.area2Text !== "No encontrado." && !data.area2Text.startsWith("Error:")) {
      updatedFormData.catNo = data.area2Text;
      fieldsUpdated = true;
    }
    if (data.area1Text && data.area1Text !== "No encontrado." && !data.area1Text.startsWith("Error:")) {
      updatedFormData.serialNumber = data.area1Text;
      fieldsUpdated = true;
    }
    if (data.area3Text && data.area3Text !== "No encontrado." && !data.area3Text.startsWith("Error:")) {
      updatedFormData.toolName = data.area3Text;
      fieldsUpdated = true;
    }

    setFormData(updatedFormData);
    setIsOcrModalOpen(false);

    if (fieldsUpdated) {
      toast({
        title: "Datos de OCR Aplicados",
        description: "Los campos del formulario se han actualizado con la información extraída.",
      });
    } else {
       let message = "No se pudo extraer información útil de la imagen.";
       if (data.area1Text?.startsWith("Error:") || data.area2Text?.startsWith("Error:") || data.area3Text?.startsWith("Error:")) {
           message = "Hubo errores durante la extracción de OCR. Algunos campos pueden no haberse llenado.";
       }
       toast({
        title: "Extracción de OCR",
        description: message,
        variant: "default",
      });
    }
  };


  const handleFormSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    setIsSubmittingForm(true);

    const fotosProcesadas: HerramientaFoto[] = [...formData.currentFotos];

    for (const file of formData.fotos) {
        const reader = new FileReader();
        const promise = new Promise<HerramientaFoto>((resolve, reject) => {
            reader.onload = (e) => {
                resolve({
                    id: `foto_${Date.now()}_${Math.random().toString(36).substring(2,5)}`,
                    url: e.target?.result as string,
                    name: file.name,
                });
            };
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
        try {
            fotosProcesadas.push(await promise);
        } catch (error) {
            toast({ title: "Error al Procesar Imagen", description: `No se pudo procesar ${file.name}.`, variant: "destructive" });
        }
    }

    if (fotosProcesadas.length > MAX_PHOTOS_PER_TOOL) {
         toast({ title: "Error", description: `Demasiadas fotos. Máximo ${MAX_PHOTOS_PER_TOOL}.`, variant: "destructive" });
         setIsSubmittingForm(false);
         return;
    }

    const herramientaData: Omit<Herramienta, 'id' | 'fechaAgregado'> = {
      catNo: formData.catNo.trim(),
      toolName: formData.toolName.trim(),
      serialNumber: formData.serialNumber.trim() || null,
      falla: formData.falla.trim() || null,
      anosGarantia: formData.anosGarantia ? parseInt(formData.anosGarantia) : null,
      fechaVencimientoGarantia: formData.fechaVencimientoGarantia,
      fotos: fotosProcesadas,
      estado: formData.estado,
      condicion: formData.condicion,
    };

    let success = false;
    if (editingHerramientaId) {
      const existingHerramienta = herramientasList.find(h => h.id === editingHerramientaId);
      const updatedHerramientaData: Herramienta = {
        ...herramientaData,
        id: editingHerramientaId,
        fechaAgregado: existingHerramienta?.fechaAgregado || new Date().toISOString()
      };
      success = await updateHerramienta(updatedHerramientaData);
      if (success) {
        toast({ title: "Herramienta Actualizada", description: `${updatedHerramientaData.toolName} actualizada.` });
      }
    } else {
      const newHerramienta: Herramienta = {
        ...herramientaData,
        id: generateHerramientaId(),
        fechaAgregado: new Date().toISOString()
      };
      success = await addHerramienta(newHerramienta);
      if (success) {
        toast({ title: "Herramienta Agregada", description: `${newHerramienta.toolName} agregada al inventario.` });
      }
    }

    if (success) {
      if (herramientaData.catNo && herramientaData.toolName) {
        await saveCatNoKnowledge(herramientaData.catNo, herramientaData.toolName);
      }
      await fetchAllData();
      clearForm();
    } else {
      toast({
        title: "Error de Almacenamiento",
        description: "No se pudo guardar la herramienta. Es posible que el almacenamiento esté lleno o haya un error de base de datos.",
        variant: "destructive",
        duration: 10000,
      });
    }
    setIsSubmittingForm(false);
  };

  const handleEditHerramienta = (herramienta: Herramienta) => {
    setEditingHerramientaId(herramienta.id);
    setFormData({
      catNo: herramienta.catNo,
      toolName: herramienta.toolName,
      serialNumber: herramienta.serialNumber || '',
      falla: herramienta.falla || '',
      anosGarantia: herramienta.anosGarantia?.toString() || '',
      fechaVencimientoGarantia: herramienta.fechaVencimientoGarantia,
      fotos: [], // New photos to be added
      currentFotos: herramienta.fotos || [], // Existing photos
      estado: herramienta.estado,
      condicion: herramienta.condicion || 'Usada', // Default to 'Usada' for old items
    });
    setSelectedImagePreviews([]); // Clear previews for new files
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const requestDeleteHerramienta = (herramienta: Herramienta) => {
    setHerramientaToDelete(herramienta);
  };

  const confirmDeleteHerramienta = async () => {
    if (herramientaToDelete) {
      setIsSubmittingForm(true);
      const success = await deleteHerramienta(herramientaToDelete.id);
      setHerramientaToDelete(null);

      if (success) {
        await fetchAllData();
        toast({ title: "Herramienta Eliminada", description: `${herramientaToDelete.toolName} eliminada del inventario.` });
        if (editingHerramientaId === herramientaToDelete.id) {
          clearForm();
        }
      } else {
         toast({
          title: "Error de Almacenamiento",
          description: "No se pudo eliminar la herramienta.",
          variant: "destructive",
          duration: 10000,
        });
        await fetchAllData(); 
      }
      setIsSubmittingForm(false);
    }
  };

  const openImageInModal = (imageUrl: string) => {
    setImageToViewInModal(imageUrl);
  };

  const closeImageModal = () => {
    setImageToViewInModal(null);
  };

  const getWarrantyDetailsForTable = (herramienta: Herramienta) => {
    const warrantyInfo = estimateWarrantyFromSerialNumber(
      herramienta.serialNumber,
      herramienta.toolName,
      herramienta.catNo,
      customWarrantyRules
    );
    const periodDetails = determineWarrantyPeriod(
      herramienta.toolName,
      herramienta.catNo,
      customWarrantyRules
    );

    let warrantyDurationText = "N/A";
    if (periodDetails.isLifetime) {
      warrantyDurationText = "Vitalicia";
    } else if (periodDetails.years !== null) {
      warrantyDurationText = `${periodDetails.years} año${periodDetails.years === 1 ? '' : 's'}`;
    } else if (periodDetails.ruleSource === 'custom' && periodDetails.years === null && !periodDetails.isLifetime) {
        warrantyDurationText = periodDetails.details.includes("0 Años") || periodDetails.details.toLowerCase().includes("sin garantía") ? "0 años" : "Pers. (Ver detalles)";
    }


    let tiempoRestanteText = "N/A";
    if (warrantyInfo.status === 'Activa' && warrantyInfo.expirationDate) {
      try {
        const expDate = parseISO(warrantyInfo.expirationDate); 
        if (isValid(expDate)) {
          tiempoRestanteText = formatDistanceStrict(expDate, new Date(), { locale: es, addSuffix: false }) + " restantes";
        }
      } catch (e) {
        console.error("Error parsing expiration date for time remaining:", e);
        tiempoRestanteText = "Error al calcular";
      }
    } else if (warrantyInfo.status === 'Expirada') {
      tiempoRestanteText = "Expirada";
    } else if (warrantyInfo.status === 'Vitalicia' || (warrantyInfo.status === 'Personalizada' && periodDetails.isLifetime)) {
      tiempoRestanteText = "Vitalicia";
    } else if (warrantyInfo.status === 'No Estimable' || warrantyInfo.status === 'Error' || warrantyInfo.status === 'Desconocida') {
        tiempoRestanteText = warrantyInfo.status;
    } else if (warrantyInfo.status === 'Personalizada' && warrantyDurationText === "0 años"){
        tiempoRestanteText = "Sin garantía";
    }

    return {
      status: warrantyInfo.status,
      expirationDate: warrantyInfo.expirationDate ? format(parseISO(warrantyInfo.expirationDate), "P", { locale: es }) : 'N/A',
      duration: warrantyDurationText,
      remaining: tiempoRestanteText,
      bgColor: getWarrantyStatusBgColor(warrantyInfo.status)
    };
  };


  return (
    <TooltipProvider>
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-6 w-6" />
                {editingHerramientaId ? 'Editar Herramienta' : 'Agregar Nueva Herramienta'}
              </CardTitle>
              <CardDescription>
                {editingHerramientaId ? 'Modifica los detalles de la herramienta seleccionada.' : 'Ingresa la información de la nueva herramienta para el inventario.'}
              </CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => setIsOcrModalOpen(true)} className="mt-2 sm:mt-0" disabled={isSubmittingForm}>
              <ScanSearch className="mr-2 h-4 w-4" />
              Llenar con Datos de Etiqueta (OCR)
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleFormSubmit}>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <Label htmlFor="catNo">CAT.NO. <span className="text-destructive">*</span></Label>
              <Input id="catNo" name="catNo" value={formData.catNo} onChange={handleInputChange} placeholder="Ej: 2767-20" required disabled={isSubmittingForm}/>
            </div>
            <div>
              <Label htmlFor="toolName">Nombre Herramienta <span className="text-destructive">*</span></Label>
              <Input id="toolName" name="toolName" value={formData.toolName} onChange={handleInputChange} placeholder="Ej: M18 FUEL Impact Driver" required disabled={isSubmittingForm}/>
            </div>
            <div>
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input id="serialNumber" name="serialNumber" value={formData.serialNumber} onChange={handleInputChange} placeholder="Ej: X123456789" disabled={isSubmittingForm}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="condicion">Condición <span className="text-destructive">*</span></Label>
                <Select name="condicion" value={formData.condicion} onValueChange={(value) => handleSelectChange('condicion', value)} required disabled={isSubmittingForm}>
                  <SelectTrigger id="condicion">
                    <SelectValue placeholder="Selecciona una condición" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nueva">Nueva</SelectItem>
                    <SelectItem value="Usada">Usada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="estado">Estado <span className="text-destructive">*</span></Label>
                <Select name="estado" value={formData.estado} onValueChange={(value) => handleSelectChange('estado', value)} required disabled={isSubmittingForm}>
                  <SelectTrigger id="estado">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operativa">Operativa</SelectItem>
                    <SelectItem value="Requiere Reparación">Requiere Reparación</SelectItem>
                    <SelectItem value="Vendido">Vendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className={cn("md:col-span-2", formData.estado !== 'Requiere Reparación' && "hidden")}>
              <Label htmlFor="falla">Falla (si Requiere Reparación)</Label>
              <Textarea id="falla" name="falla" value={formData.falla} onChange={handleInputChange} placeholder="Describe la falla de la herramienta" rows={2} disabled={isSubmittingForm}/>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border-t pt-4 mt-2">
                <div>
                  <Label htmlFor="anosGarantia">Años de Garantía (Ej: 3, 5)</Label>
                  <Input id="anosGarantia" name="anosGarantia" type="number" value={formData.anosGarantia} onChange={handleInputChange} placeholder="Ej: 5" min="0" disabled={isSubmittingForm}/>
                </div>
                <div>
                    <Label htmlFor="fechaVencimientoGarantia">Fecha Vencimiento Garantía</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.fechaVencimientoGarantia && "text-muted-foreground"
                            )}
                            disabled={isSubmittingForm}
                        >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {formData.fechaVencimientoGarantia ? format(isoStringToDate(formData.fechaVencimientoGarantia)!, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={formData.fechaVencimientoGarantia ? isoStringToDate(formData.fechaVencimientoGarantia) : undefined}
                            onSelect={handleDateChange}
                            initialFocus
                            locale={es}
                            captionLayout="dropdown-buttons"
                            fromYear={2010}
                            toYear={new Date().getFullYear() + 10}
                            disabled={isSubmittingForm}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <div className="md:col-span-2 mt-0 space-y-2">
                {isEstimatingWarranty && (
                    <div className="flex items-center text-sm text-muted-foreground p-2">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Estimando garantía desde S/N...
                    </div>
                )}
                {estimatedWarrantyInfo && !isEstimatingWarranty && (
                    <div className={cn(
                        "p-3 rounded-md text-sm space-y-1 border",
                        getWarrantyStatusBgColor(estimatedWarrantyInfo.status)
                    )}>
                        <p className="font-semibold flex items-center">
                            <ShieldCheck className="h-4 w-4 mr-1.5 flex-shrink-0" />
                            Estimación de Garantía: {estimatedWarrantyInfo.status}
                             {estimatedWarrantyInfo.expirationDate && ` (Vence: ${format(parseISO(estimatedWarrantyInfo.expirationDate), "P", {locale: es})})`}
                        </p>
                        <p>{estimatedWarrantyInfo.message}</p>
                        {estimatedWarrantyInfo.estimationDetails && (
                            <p className="text-xs opacity-80 pt-1 mt-1 border-t border-current/30">
                                Detalle: {estimatedWarrantyInfo.estimationDetails}
                            </p>
                        )}
                         <p className="text-xs opacity-70 mt-1">
                           Esta es una estimación. Verifica con Milwaukee eService para confirmación.
                         </p>
                    </div>
                )}
                 {(!formData.serialNumber || formData.serialNumber.trim() === "") && !isEstimatingWarranty && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                        Ingresa un Número de Serie para ver una estimación de garantía.
                    </p>
                 )}
            </div>


            <div className="md:col-span-2 border-t pt-4 mt-2">
              <Label htmlFor="fotos">Fotos (Máx {MAX_PHOTOS_PER_TOOL}, {MAX_PHOTO_SIZE_MB}MB c/u)</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input
                    id="fotos"
                    name="fotos"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoInputChange}
                    ref={fileInputRef}
                    className="hidden"
                    disabled={isSubmittingForm}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}
                        disabled={(formData.currentFotos.length + selectedImagePreviews.length) >= MAX_PHOTOS_PER_TOOL || isSubmittingForm}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Seleccionar Fotos
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsToolPhotoCameraModalOpen(true)}
                        disabled={(formData.currentFotos.length + selectedImagePreviews.length) >= MAX_PHOTOS_PER_TOOL || isSubmittingForm}>
                    <CameraIcon className="mr-2 h-4 w-4" />
                    Capturar Foto
                </Button>
                <span className="text-sm text-muted-foreground">
                    ({formData.currentFotos.length + selectedImagePreviews.length} / {MAX_PHOTOS_PER_TOOL})
                </span>
              </div>

                {(formData.currentFotos.length > 0 || selectedImagePreviews.length > 0) && (
                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {formData.currentFotos.map((foto) => (
                        <div key={foto.id} className="relative group aspect-square">
                            <Image
                                src={foto.url}
                                alt={foto.name || 'Foto existente'}
                                layout="fill"
                                objectFit="cover"
                                className="rounded-md cursor-pointer"
                                onClick={() => !isSubmittingForm && openImageInModal(foto.url)}
                                data-ai-hint="tool image"
                            />
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col gap-1">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-6 w-6 bg-black/50 hover:bg-black/70 text-white"
                                    onClick={(e) => { e.stopPropagation(); !isSubmittingForm && openImageInModal(foto.url); }}
                                    title="Ver imagen"
                                    disabled={isSubmittingForm}
                                >
                                    <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => { e.stopPropagation(); !isSubmittingForm && removeCurrentFoto(foto.id); }}
                                    title="Eliminar imagen"
                                    disabled={isSubmittingForm}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {selectedImagePreviews.map((previewUrl, index) => (
                        <div key={previewUrl} className="relative group aspect-square">
                            <Image
                                src={previewUrl}
                                alt={`Nueva foto ${index + 1}`}
                                layout="fill"
                                objectFit="cover"
                                className="rounded-md cursor-pointer"
                                onClick={() => !isSubmittingForm && openImageInModal(previewUrl)}
                                data-ai-hint="tool image"
                            />
                             <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col gap-1">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-6 w-6 bg-black/50 hover:bg-black/70 text-white"
                                    onClick={(e) => { e.stopPropagation(); !isSubmittingForm && openImageInModal(previewUrl); }}
                                    title="Ver imagen"
                                    disabled={isSubmittingForm}
                                >
                                    <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => { e.stopPropagation(); !isSubmittingForm && removeSelectedPreview(index);}}
                                    title="Eliminar imagen"
                                    disabled={isSubmittingForm}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t pt-6">
            <Button type="button" variant="outline" onClick={clearForm} disabled={isSubmittingForm}>
              <Eraser className="mr-2 h-4 w-4" />
              {editingHerramientaId ? 'Cancelar Edición' : 'Limpiar Formulario'}
            </Button>
            <Button type="submit" disabled={isSubmittingForm}>
              {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (editingHerramientaId ? <><Edit3 className="mr-2 h-4 w-4" /> Guardar Cambios</> : <><PlusCircle className="mr-2 h-4 w-4" /> Agregar Herramienta</>)}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Inventario de Herramientas
          </CardTitle>
          <CardDescription>
            Visualiza, edita o elimina herramientas del inventario. La información de garantía es una estimación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHerramientas ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Cargando herramientas...</p>
            </div>
          ) : herramientasList.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No hay herramientas registradas en el inventario.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CAT.NO.</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>S/N</TableHead>
                    <TableHead>Condición</TableHead>
                    <TableHead>Estado Herr.</TableHead>
                    <TableHead>Garantía (Est./Vence)</TableHead>
                    <TableHead className="text-center">Fotos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {herramientasList.map((h) => {
                    const warrantyDetails = getWarrantyDetailsForTable(h);
                    const isSold = h.estado === 'Vendido';
                    return (
                      <TableRow key={h.id} className={cn(isSold && "bg-muted/40 text-muted-foreground")}>
                        <TableCell className="font-medium whitespace-nowrap">{h.catNo}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate" title={h.toolName}>{h.toolName}</TableCell>
                        <TableCell className="whitespace-nowrap max-w-[150px] truncate" title={h.serialNumber || ''}>{h.serialNumber || '-'}</TableCell>
                        <TableCell>
                           <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap",
                              h.condicion === 'Nueva' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                              isSold && "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                              )}>
                              {h.condicion || 'Usada'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap",
                              h.estado === 'Operativa' && 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200',
                              h.estado === 'Requiere Reparación' && 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200',
                              h.estado === 'Vendido' && 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200'
                              )}>
                              {h.estado}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                           <Tooltip>
                              <TooltipTrigger asChild>
                                  <div className="flex flex-col items-start cursor-help">
                                    <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full", warrantyDetails.bgColor, isSold && "opacity-60")}>
                                      {warrantyDetails.status}
                                    </span>
                                    {warrantyDetails.status !== "Vitalicia" && warrantyDetails.status !== "Personalizada" && warrantyDetails.status !== "No Estimable" && warrantyDetails.status !== "Error" && warrantyDetails.status !== "Desconocida" && warrantyDetails.expirationDate !== 'N/A' && (
                                      <span className="mt-1 text-xs text-muted-foreground">Vence: {warrantyDetails.expirationDate}</span>
                                    )}
                                  </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p><strong>Duración:</strong> {warrantyDetails.duration}</p>
                                <p><strong>Restante:</strong> {warrantyDetails.remaining}</p>
                              </TooltipContent>
                           </Tooltip>
                        </TableCell>
                        <TableCell className="text-center">{h.fotos?.length || 0}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditHerramienta(h)} title="Editar" disabled={isSubmittingForm || isSold}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => requestDeleteHerramienta(h)} title="Eliminar" className="text-destructive hover:text-destructive" disabled={isSubmittingForm}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {herramientaToDelete && (
        <AlertDialog open={!!herramientaToDelete} onOpenChange={(open) => !open && setHerramientaToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar Eliminación?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar la herramienta {herramientaToDelete.toolName} (S/N: {herramientaToDelete.serialNumber || 'N/A'})?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setHerramientaToDelete(null)} disabled={isSubmittingForm}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteHerramienta} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isSubmittingForm}>
                {isSubmittingForm && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <OcrExtractionModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onDataExtracted={handleOcrDataExtracted}
      />
      <CameraPreviewModal
        isOpen={isToolPhotoCameraModalOpen}
        onClose={() => setIsToolPhotoCameraModalOpen(false)}
        onImageCaptured={handleToolPhotoCaptured}
      />

      {imageToViewInModal && (
        <Dialog open={!!imageToViewInModal} onOpenChange={(open) => !open && closeImageModal()}>
          <DialogContent className="max-w-3xl p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Vista Previa de Imagen</DialogTitle>
               <DialogClose asChild>
                <Button variant="ghost" size="icon" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" /><span className="sr-only">Cerrar</span>
                </Button>
              </DialogClose>
            </DialogHeader>
            <div className="p-4 max-h-[70vh] overflow-auto">
              <Image
                src={imageToViewInModal}
                alt="Imagen ampliada"
                width={800}
                height={600}
                objectFit="contain"
                className="mx-auto rounded-md"
                data-ai-hint="large preview"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
    </TooltipProvider>
  );
}

    
