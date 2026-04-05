

"use client";

import { useState, useEffect, type FormEvent, useRef, useMemo } from 'react';
import { PlusCircle, Edit3, Trash2, Wrench, Package, Camera as CameraIcon, CalendarDays, Eraser, UploadCloud, ScanSearch, Eye, X, ShieldCheck, AlertTriangle, Loader2, Info, BadgeDollarSign, RotateCw, ZoomIn, ZoomOut, Download, Maximize2, Minimize2, Sparkles, ArrowDown, ArrowUp, Search, ArrowLeft, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useDashboardSync } from '@/hooks/use-dashboard-sync';
import { useRealtimeInvalidate } from '@/hooks/use-realtime';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isValid, parseISO, formatDistanceStrict, differenceInDays } from "date-fns";
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  type Herramienta,
  type HerramientaFoto,
  getHerramientasList,
  getHerramientaById,
  addHerramienta,
  updateHerramienta,
  deleteHerramienta,
  generateHerramientaId,
  dateToIsoString,
  isoStringToDate,
  getHerramientaBySerialNumber,
} from '@/lib/herramientas-storage';
import { OcrExtractionModal } from '@/components/loma-dashboard/OcrExtractionModal';
import type { ComponentBatteryInfoOutput } from '@/ai/flows/extractBatteryInfoFlow';
import { CameraPreviewModal } from '@/components/camclick/CameraPreviewModal';
import { type WarrantyInfo, estimateWarrantyFromSerialNumber, getWarrantyStatusBgColor, determineWarrantyPeriod } from '@/lib/warranty-utils';
import { addWarrantyLearningEntry, calculateImprovedWarrantyDate } from '@/lib/warranty-learning-storage';
import { addSerialLearningEntry, applySerialLearning } from '@/lib/serial-learning-storage';
import { isCatNoKnown, getCatNoKnowledge, addOrUpdateCatNoKnowledge, markCatNoAsVerified } from '@/lib/catno-knowledge-base';
import { getCustomWarrantyRules, addCustomWarrantyRule, updateCustomWarrantyRule, type WarrantyRule } from '@/lib/warranty-rules-storage';
import { saveCatNoKnowledge, getToolNameByCatNo as getLearnedToolName } from '@/lib/cat-no-knowledge-storage';


const MAX_PHOTO_SIZE_MB = 5;
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;
const MAX_PHOTOS_PER_TOOL = 10;


// Form data type
type FormDataType = {
  catNo: string;
  toolName: string;
  serialNumber: string | null;
  precio: number | null;
  falla: string | null;
  anosGarantia: string; // String for form input
  fechaVencimientoGarantia: string | null;
  fechaMilwaukee: string | null;
  fotos: File[];
  currentFotos: HerramientaFoto[];
  estado: 'Operativa' | 'Requiere Reparación' | 'Vendido';
  condicion: 'Nueva' | 'Usada' | 'Usada (Reparada)';
};

const initialFormState: FormDataType = {
  catNo: '',
  toolName: '',
  serialNumber: '',
  precio: null,
  falla: '',
  anosGarantia: '', // String for form input
  fechaVencimientoGarantia: null,
  fechaMilwaukee: null, // Nueva fecha de Milwaukee para aprendizaje
  fotos: [],
  currentFotos: [],
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
  const [formData, setFormData] = useState<FormDataType>(initialFormState);
  const [editingHerramientaId, setEditingHerramientaId] = useState<string | null>(null);
  const [herramientaToDelete, setHerramientaToDelete] = useState<Herramienta | null>(null);
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isToolPhotoCameraModalOpen, setIsToolPhotoCameraModalOpen] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  
  const [toolToChangeStatus, setToolToChangeStatus] = useState<Herramienta | null>(null);
  const [newStatusForTool, setNewStatusForTool] = useState<Herramienta['estado'] | ''>('');
  const [toolToViewDetails, setToolToViewDetails] = useState<Herramienta | null>(null);


  // Image Viewer Modal State
  const [imageToView, setImageToView] = useState<{ url: string; id: string; type: 'current' | 'new'; index?: number; name?: string; rotation?: number; } | null>(null);
  const [modalZoom, setModalZoom] = useState(1);
  const [modalRotation, setModalRotation] = useState(0);
  const [isMaximized, setIsMaximized] = useState(false);
  const [newPhotoRotations, setNewPhotoRotations] = useState<Record<string, number>>({});
  const [toolToViewPhotos, setToolToViewPhotos] = useState<Herramienta | null>(null);
  const [imageToMaximize, setImageToMaximize] = useState<HerramientaFoto | null>(null);

  // Warranty and Duplication State
  const [estimatedWarrantyInfo, setEstimatedWarrantyInfo] = useState<WarrantyInfo | null>(null);
  
  // Milwaukee Date Learning State
  const [isMilwaukeeCalendarOpen, setIsMilwaukeeCalendarOpen] = useState(false);
  const [tempMilwaukeeDate, setTempMilwaukeeDate] = useState<Date | undefined>(undefined);
  const [showLearningPrompt, setShowLearningPrompt] = useState(false);
  const [learningData, setLearningData] = useState<{
    catNo: string;
    serialNumber: string;
    fechaCalculada: string;
    fechaMilwaukee: string;
    añosGarantia: number;
  } | null>(null);
  
  // Bandera para saber si el usuario modificó manualmente la fecha
  const [userModifiedDate, setUserModifiedDate] = useState(false);
  
  // CAT.NO. Knowledge State
  const [isNewCatNo, setIsNewCatNo] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [pendingOcrData, setPendingOcrData] = useState<ComponentBatteryInfoOutput | null>(null);
  const [isEstimatingWarranty, setIsEstimatingWarranty] = useState<boolean>(false);
  const [customWarrantyRules, setCustomWarrantyRules] = useState<WarrantyRule[]>([]);
  const [duplicationWarning, setDuplicationWarning] = useState<string | null>(null);
  
  // Quick Rule Creation State
  const [showQuickRuleModal, setShowQuickRuleModal] = useState(false);
  const [isCreatingQuickRule, setIsCreatingQuickRule] = useState(false);

  // Search and Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Herramienta; direction: 'ascending' | 'descending' }>({ key: 'fechaAgregado', direction: 'descending' });

  // Calendar state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempCalendarDate, setTempCalendarDate] = useState<Date | undefined>(undefined);


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

  useDashboardSync(fetchAllData);
  useRealtimeInvalidate('herramientas', fetchAllData);

  useEffect(() => {
    const estimateAndAutofill = async () => {
        const serial = formData.serialNumber?.trim();
        const catNo = formData.catNo?.trim();

        // Always show the estimation based on serial, but only autofill if fields are empty.
        // This allows manual overrides.
        if (!serial) {
            setEstimatedWarrantyInfo(null);
            if (!editingHerramientaId) { // Only clear if adding new, not editing
                setFormData(prev => ({ ...prev, anosGarantia: '', fechaVencimientoGarantia: null }));
            }
            return;
        }

        setIsEstimatingWarranty(true);
        await new Promise(resolve => setTimeout(resolve, 50));

        const periodDetails = determineWarrantyPeriod(
            formData.toolName, catNo, customWarrantyRules
        );

        // IMPORTANTE: Usar los años de la regla personalizada si existe
        const añosGarantiaAUsar = periodDetails.years || 5;

        const estimationResult = estimateWarrantyFromSerialNumber(
            serial, formData.toolName, catNo, customWarrantyRules, formData.fechaVencimientoGarantia
        );

        let finalEstimationResult = estimationResult;
        let learningApplied = false;
        let añosGarantiaAprendidos: number | null = añosGarantiaAUsar; // Usar los años de la regla

        // Primero: Aplicar aprendizaje de serial específico si existe (prioridad más alta)
        const serialLearningResult = await applySerialLearning(serial, estimationResult.expirationDate || '');
        
        if (serialLearningResult.aprendizajeAplicado) {
            finalEstimationResult = {
                ...estimationResult,
                expirationDate: serialLearningResult.fechaMejorada,
                message: `${estimationResult.message} + ${serialLearningResult.razon}`,
                estimationDetails: `${estimationResult.estimationDetails || ''} | ${serialLearningResult.razon}`
            };
            learningApplied = true;
        }
        
        // Segundo: Si no hay aprendizaje de serial, aplicar aprendizaje por CAT.NO.
        if (!learningApplied && catNo && estimationResult.expirationDate) {
            const catNoLearningResult = await calculateImprovedWarrantyDate(
                catNo,
                estimationResult.expirationDate,
                añosGarantiaAUsar
            );
            
            if (catNoLearningResult.confianza > 0.5) {
                finalEstimationResult = {
                    ...estimationResult,
                    expirationDate: catNoLearningResult.fechaMejorada,
                    message: `${estimationResult.message} + ${catNoLearningResult.razon}`,
                    estimationDetails: `${estimationResult.estimationDetails || ''} | ${catNoLearningResult.razon}`
                };
                // Solo sobrescribir si el aprendizaje tiene años diferentes
                if (catNoLearningResult.añosGarantiaMejorados !== null) {
                    añosGarantiaAprendidos = catNoLearningResult.añosGarantiaMejorados;
                }
                learningApplied = true;
            }
        }

        setEstimatedWarrantyInfo(finalEstimationResult);

        // Autofill logic: only if adding new and fields are empty.
        if (!editingHerramientaId) {
            setFormData(prev => {
                // Si hay años aprendidos, usarlos; si no, usar los del periodo detectado
                let newYears = '';
                if (añosGarantiaAprendidos !== null) {
                    newYears = String(añosGarantiaAprendidos);
                } else if (periodDetails.isLifetime) {
                    newYears = '';
                } else if (periodDetails.years !== null) {
                    newYears = String(periodDetails.years);
                } else {
                    newYears = prev.anosGarantia;
                }
                
                // NO actualizar la fecha si el usuario la modificó manualmente
                let newDate = prev.fechaVencimientoGarantia;
                
                if (!userModifiedDate) {
                    // Solo actualizar si el usuario NO ha modificado manualmente
                    if (learningApplied && finalEstimationResult.expirationDate) {
                        // Si se aplicó aprendizaje, usar la fecha mejorada
                        newDate = finalEstimationResult.expirationDate;
                    } else if (prev.fechaVencimientoGarantia === null) {
                        // Si no hay fecha previa, usar la calculada
                        newDate = finalEstimationResult.expirationDate || null;
                    }
                }

                return {
                    ...prev,
                    anosGarantia: newYears,
                    fechaVencimientoGarantia: newDate,
                };
            });
        }
        setIsEstimatingWarranty(false);
    };

    if (!isLoadingHerramientas) {
        estimateAndAutofill();
    }
  }, [formData.serialNumber, formData.catNo, formData.toolName, customWarrantyRules, isLoadingHerramientas, editingHerramientaId]);


  // Autofill tool name & check if CAT.NO. is new
  useEffect(() => {
    if (isLoadingHerramientas) return;

    const catNo = formData.catNo.trim();
    if (!catNo) {
        setIsNewCatNo(false);
        return;
    }
    
    const checkCatNo = async () => {
      const toolNameFound = await getLearnedToolName(catNo);
      if (toolNameFound) {
        setIsNewCatNo(false);
        // Only autofill if the tool name is currently empty, to avoid overwriting user input
        if (!formData.toolName) { 
          setFormData(prev => ({ ...prev, toolName: toolNameFound }));
        }
      } else {
        setIsNewCatNo(true);
      }
    };

    const handler = setTimeout(() => {
      checkCatNo();
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [formData.catNo, isLoadingHerramientas]);


  // Check for duplicate Serial Number
  useEffect(() => {
    const trimmedSerial = formData.serialNumber?.trim();
    if (!trimmedSerial) {
      setDuplicationWarning(null);
      return;
    }

    const handler = setTimeout(async () => {
      const existingTool = await getHerramientaBySerialNumber(trimmedSerial);
      
      if (existingTool && existingTool.id !== editingHerramientaId) {
        setDuplicationWarning(
          `¡Atención! Este número de serie ya está registrado para la herramienta "${existingTool.toolName}" (CAT.NO: ${existingTool.catNo}). Los números de serie deben ser únicos.`
        );
      } else {
        setDuplicationWarning(null);
      }
    }, 500); // Debounce check for 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [formData.serialNumber, editingHerramientaId]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => {
      const newState = { ...prev, [name]: value as Herramienta['estado'] | Herramienta['condicion'] };
      if (name === 'estado' && value === 'Requiere Reparación') {
        newState.precio = null;
      }
      return newState;
    });
  };

  const handleDateChange = (date: Date | undefined) => {
    setTempCalendarDate(date);
  };
  
  const handleCalendarOpenChange = (open: boolean) => {
    setIsCalendarOpen(open);
    if (open) {
      setTempCalendarDate(formData.fechaVencimientoGarantia ? isoStringToDate(formData.fechaVencimientoGarantia) || undefined : undefined);
    }
  };
  
  const handleAcceptDate = () => {
    setFormData(prev => ({ ...prev, fechaVencimientoGarantia: tempCalendarDate ? dateToIsoString(tempCalendarDate) : null }));
    setUserModifiedDate(true); // Marcar que el usuario modificó la fecha manualmente
    setIsCalendarOpen(false);
  };

  // Milwaukee Calendar Handlers
  const handleMilwaukeeCalendarOpenChange = (open: boolean) => {
    setIsMilwaukeeCalendarOpen(open);
    if (open) {
      setTempMilwaukeeDate(formData.fechaMilwaukee ? isoStringToDate(formData.fechaMilwaukee) || undefined : undefined);
    }
  };
  
  const handleAcceptMilwaukeeDate = () => {
    const newMilwaukeeDate = tempMilwaukeeDate ? dateToIsoString(tempMilwaukeeDate) : null;
    setFormData(prev => ({ ...prev, fechaMilwaukee: newMilwaukeeDate }));
    setIsMilwaukeeCalendarOpen(false);
    
    // Si hay fecha calculada y fecha Milwaukee, preparar datos de aprendizaje
    if (newMilwaukeeDate && formData.fechaVencimientoGarantia && formData.catNo && formData.serialNumber) {
      const fechaCalculada = new Date(formData.fechaVencimientoGarantia);
      const fechaMilwaukee = new Date(newMilwaukeeDate);
      const diferenciaDias = Math.round((fechaMilwaukee.getTime() - fechaCalculada.getTime()) / (1000 * 60 * 60 * 24));
      
      if (Math.abs(diferenciaDias) > 0) { // Solo si hay diferencia
        setLearningData({
          catNo: formData.catNo,
          serialNumber: formData.serialNumber,
          fechaCalculada: formData.fechaVencimientoGarantia,
          fechaMilwaukee: newMilwaukeeDate,
          añosGarantia: parseInt(formData.anosGarantia) || 5
        });
        setShowLearningPrompt(true);
      }
    }
  };

  // Learning Functions
  const handleSaveLearning = async () => {
    if (!learningData) return;
    
    const diferenciaDias = Math.round((new Date(learningData.fechaMilwaukee).getTime() - new Date(learningData.fechaCalculada).getTime()) / (1000 * 60 * 60 * 24));
    
    // Determinar tipo de producto basado en CAT.NO o descripción
    let tipoProducto: 'herramienta' | 'bateria' | 'accesorio' = 'herramienta';
    if (formData.toolName.toLowerCase().includes('battery') || formData.toolName.toLowerCase().includes('bateria')) {
      tipoProducto = 'bateria';
    } else if (formData.toolName.toLowerCase().includes('charger') || formData.toolName.toLowerCase().includes('cargador')) {
      tipoProducto = 'accesorio';
    }
    
    // Guardar aprendizaje general por CAT.NO.
    const generalSuccess = await addWarrantyLearningEntry({
      catNo: learningData.catNo,
      serialNumber: learningData.serialNumber,
      fechaCalculadaApp: learningData.fechaCalculada,
      fechaRealMilwaukee: learningData.fechaMilwaukee,
      diferenciaDias,
      tipoProducto,
      añosGarantia: learningData.añosGarantia,
      confianza: 0.8 // Confianza alta para correcciones manuales
    });

    // Guardar aprendizaje específico del serial
    const serialSuccess = await addSerialLearningEntry({
      serialNumber: learningData.serialNumber,
      catNo: learningData.catNo,
      fechaCalculadaApp: learningData.fechaCalculada,
      fechaRealMilwaukee: learningData.fechaMilwaukee,
      diferenciaDias,
      confianza: 0.95 // Confianza muy alta para seriales específicos
    });
    
    if (generalSuccess && serialSuccess) {
      toast({
        title: "Aprendizaje Completo Guardado",
        description: `La app aprendió tanto para el CAT.NO. ${learningData.catNo} como para este serial específico.`
      });
      
      // Actualizar la fecha de garantía con la fecha de Milwaukee
      setFormData(prev => ({ ...prev, fechaVencimientoGarantia: learningData!.fechaMilwaukee }));
    } else if (generalSuccess || serialSuccess) {
      toast({
        title: "Aprendizaje Parcial Guardado",
        description: `Se guardó ${generalSuccess ? 'el aprendizaje general' : ''} ${serialSuccess ? 'el aprendizaje del serial' : ''}.`
      });
      
      // Actualizar la fecha de garantía con la fecha de Milwaukee
      setFormData(prev => ({ ...prev, fechaVencimientoGarantia: learningData!.fechaMilwaukee }));
    } else {
      toast({
        title: "Error",
        description: "No se pudo guardar el aprendizaje.",
        variant: "destructive"
      });
    }
    
    setShowLearningPrompt(false);
    setLearningData(null);
  };

  // CAT.NO. Knowledge Functions
  const applyCatNoKnowledge = async (catNo: string) => {
    const knowledge = await getCatNoKnowledge(catNo);
    if (knowledge) {
      setFormData(prev => ({
        ...prev,
        catNo: knowledge.catNo,
        toolName: knowledge.toolName
      }));
      
      // Actualizar contador de uso
      await addOrUpdateCatNoKnowledge(knowledge.catNo, knowledge.toolName, knowledge.isVerified);
      
      toast({
        title: "CAT.NO. Conocido",
        description: `Información aplicada automáticamente: ${knowledge.toolName}`
      });
    }
  };

  const handleConfirmCorrection = async () => {
    if (!pendingOcrData) return;
    
    // Aplicar datos del OCR
    await processOcrData(pendingOcrData);
    
    // Marcar como verificado manualmente usando los datos del OCR
    const catNo = pendingOcrData.area1?.trim();
    const toolName = pendingOcrData.area3?.trim() || formData.toolName;
    
    if (catNo && toolName) {
      await addOrUpdateCatNoKnowledge(catNo, toolName, true);
      await markCatNoAsVerified(catNo);
    }
    
    setShowCorrectionModal(false);
    setPendingOcrData(null);
    setIsNewCatNo(false);
    
    toast({
      title: "CAT.NO. Verificado",
      description: "La información ha sido guardada y verificada para futuros usos."
    });
  };

  const handleSkipCorrection = async () => {
    if (!pendingOcrData) return;
    
    // Aplicar datos sin verificar
    await processOcrData(pendingOcrData);
    
    // Guardar como no verificado usando los datos del OCR
    const catNo = pendingOcrData.area1?.trim();
    const toolName = pendingOcrData.area3?.trim() || formData.toolName;
    
    if (catNo && toolName) {
      await addOrUpdateCatNoKnowledge(catNo, toolName, false);
    }
    
    setShowCorrectionModal(false);
    setPendingOcrData(null);
    setIsNewCatNo(false);
    
    toast({
      title: "Datos Aplicados",
      description: "La información del OCR ha sido aplicada al formulario."
    });
  };

  // Quick Rule Creation
  const handleCreateQuickRule = async () => {
    if (!formData.catNo.trim()) {
      toast({ title: "Error", description: "Ingresa un CAT.NO. primero.", variant: "destructive" });
      return;
    }
    
    if (!formData.anosGarantia || isNaN(parseInt(formData.anosGarantia))) {
      toast({ title: "Error", description: "Ingresa los años de garantía primero.", variant: "destructive" });
      return;
    }
    
    // Verificar si ya existe una regla para este CAT.NO.
    const existingRule = customWarrantyRules.find(
      rule => rule.catNo.toUpperCase() === formData.catNo.trim().toUpperCase()
    );
    
    if (existingRule) {
      // Si existe, mostrar mensaje diferente en el modal
      toast({ 
        title: "Regla Existente", 
        description: `Ya existe una regla para CAT.NO. ${formData.catNo} (${existingRule.years} años). La regla se actualizará a ${formData.anosGarantia} años.`,
        duration: 5000
      });
    }
    
    setIsCreatingQuickRule(true);
    
    const ruleData: Omit<WarrantyRule, 'id'> = {
      catNo: formData.catNo.trim().toUpperCase(),
      years: parseInt(formData.anosGarantia),
      description: formData.toolName.trim() || `${formData.catNo} - ${formData.anosGarantia} años`,
      isLifetime: false,
    };
    
    let success = false;
    
    if (existingRule) {
      // Actualizar regla existente
      success = await updateCustomWarrantyRule({ ...ruleData, id: existingRule.id });
      
      if (success) {
        toast({ 
          title: "Regla Actualizada", 
          description: `Regla para CAT.NO. ${formData.catNo} actualizada a ${formData.anosGarantia} años.` 
        });
      }
    } else {
      // Crear nueva regla
      success = await addCustomWarrantyRule(ruleData);
      
      if (success) {
        toast({ 
          title: "Regla Creada", 
          description: `Nueva regla de ${formData.anosGarantia} años para CAT.NO. ${formData.catNo} creada exitosamente.` 
        });
      }
    }
    
    if (success) {
      // Recargar las reglas
      const updatedRules = await getCustomWarrantyRules();
      setCustomWarrantyRules(updatedRules);
      
      setShowQuickRuleModal(false);
    } else {
      toast({ 
        title: "Error", 
        description: "No se pudo guardar la regla.", 
        variant: "destructive" 
      });
    }
    
    setIsCreatingQuickRule(false);
  };

  const processOcrData = async (normalizedData: ComponentBatteryInfoOutput) => {
    let fieldsUpdated = false;
    const updatedFormData = { ...formData };

    // area1 = CAT NO / Modelo
    if (normalizedData.area1 && normalizedData.area1.trim() && normalizedData.area1 !== "No encontrado." && !normalizedData.area1.startsWith("Error:")) {
      updatedFormData.catNo = normalizedData.area1.trim();
      fieldsUpdated = true;
    }
    
    // area2 = Serial Number
    if (normalizedData.area2 && normalizedData.area2.trim() && normalizedData.area2 !== "No encontrado." && !normalizedData.area2.startsWith("Error:")) {
      updatedFormData.serialNumber = normalizedData.area2.replace(/\s/g, '');
      fieldsUpdated = true;
    }
    
    // area3 = Información adicional (puede usarse para nombre de herramienta)
    if (normalizedData.area3 && normalizedData.area3.trim() && normalizedData.area3 !== "No encontrado." && !normalizedData.area3.startsWith("Error:")) {
      // Solo actualizar el nombre si está vacío
      if (!updatedFormData.toolName) {
        updatedFormData.toolName = normalizedData.area3.trim();
        fieldsUpdated = true;
      }
    }

    if (fieldsUpdated) {
      setFormData(updatedFormData);
      
      const extractedInfo = [];
      if (normalizedData.area1) extractedInfo.push(`CAT NO: ${normalizedData.area1}`);
      if (normalizedData.area2) extractedInfo.push(`Serial: ${normalizedData.area2}`);
      if (normalizedData.area3) extractedInfo.push(`Info: ${normalizedData.area3}`);
      
      toast({
        title: "Datos de OCR Aplicados",
        description: `Información extraída: ${extractedInfo.join(', ')}`,
      });
    }
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
      const filename = `captured_tool_photo_${timestamp}_${randomSuffix}.jpeg`;
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
    const urlToRemove = selectedImagePreviews[index];
    URL.revokeObjectURL(urlToRemove); // Clean up blob URL
    setSelectedImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({ ...prev, fotos: prev.fotos.filter((_, i) => i !== index) }));
    setNewPhotoRotations(prev => {
        const newState = { ...prev };
        delete newState[urlToRemove];
        return newState;
    });
  };

  const removeCurrentFoto = (photoId: string) => {
    setFormData(prev => ({ ...prev, currentFotos: prev.currentFotos.filter(f => f.id !== photoId) }));
  };


  const clearForm = () => {
    // Revoke all blob URLs to prevent memory leaks
    selectedImagePreviews.forEach(url => URL.revokeObjectURL(url));
    setFormData(initialFormState);
    setSelectedImagePreviews([]);
    setEditingHerramientaId(null);
    
    // Clear learning state
    setShowLearningPrompt(false);
    setLearningData(null);
    setTempMilwaukeeDate(undefined);
    setEstimatedWarrantyInfo(null);
    setIsNewCatNo(false);
    setDuplicationWarning(null);
    setNewPhotoRotations({});
    setUserModifiedDate(false); // Resetear bandera de modificación manual
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const validateForm = (): boolean => {
    if (duplicationWarning) {
      toast({ title: "Error de Duplicación", description: "No se puede guardar porque el número de serie ya existe en otra herramienta.", variant: "destructive" });
      return false;
    }
    if (!formData.catNo.trim() || !formData.toolName.trim()) {
      toast({ title: "Error de Validación", description: "CAT.NO. y Nombre de Herramienta son obligatorios.", variant: "destructive" });
      return false;
    }
    if (formData.anosGarantia && isNaN(parseInt(formData.anosGarantia))) {
      toast({ title: "Error de Validación", description: "Años de Garantía debe ser un número.", variant: "destructive" });
      return false;
    }
    if (formData.estado === 'Requiere Reparación' && !formData.falla?.trim()) {
        toast({ title: "Error de Validación", description: "Si la herramienta Requiere Reparación, la Falla es obligatoria.", variant: "destructive" });
        return false;
    }
    return true;
  };

  const handleOcrDataExtracted = async (data: ComponentBatteryInfoOutput | { area1Text: string | null; area2Text: string | null; area3Text: string | null; }) => {
    // Convert old format to new format if needed
    const normalizedData: ComponentBatteryInfoOutput = 'success' in data ? data : {
      success: true,
      area1: (data as any).area1Text,
      area2: (data as any).area2Text,
      area3: (data as any).area3Text
    };

    let fieldsUpdated = false;
    const updatedFormData = { ...formData };
    let catNoKnowledgeApplied = false;

    // area1 = CAT NO / Modelo - siempre aplicar si está disponible
    if (normalizedData.area1 && normalizedData.area1.trim() && normalizedData.area1 !== "No encontrado." && !normalizedData.area1.startsWith("Error:")) {
      updatedFormData.catNo = normalizedData.area1.trim();
      fieldsUpdated = true;

      // Verificar si el CAT.NO. es conocido y aplicar conocimiento
      const catNoExists = await isCatNoKnown(normalizedData.area1.trim());
      
      if (catNoExists) {
        // CAT.NO. conocido - aplicar conocimiento automáticamente
        const knowledge = await getCatNoKnowledge(normalizedData.area1.trim());
        if (knowledge) {
          updatedFormData.toolName = knowledge.toolName; // Usar nombre conocido, no el del OCR
          catNoKnowledgeApplied = true;
          setIsNewCatNo(false);
          
          // Actualizar contador de uso
          await addOrUpdateCatNoKnowledge(knowledge.catNo, knowledge.toolName, knowledge.isVerified);
        }
      } else {
        // CAT.NO. nuevo - mostrar modal de corrección
        setIsNewCatNo(true);
        setPendingOcrData(normalizedData);
        setShowCorrectionModal(true);
        setIsOcrModalOpen(false);
        return;
      }
    }
    
    // area2 = Serial Number - siempre aplicar si está disponible
    if (normalizedData.area2 && normalizedData.area2.trim() && normalizedData.area2 !== "No encontrado." && !normalizedData.area2.startsWith("Error:")) {
      updatedFormData.serialNumber = normalizedData.area2.replace(/\s/g, '');
      fieldsUpdated = true;
    }
    
    // area3 = Información adicional - solo usar si no se aplicó conocimiento del CAT.NO.
    if (normalizedData.area3 && normalizedData.area3.trim() && normalizedData.area3 !== "No encontrado." && !normalizedData.area3.startsWith("Error:")) {
      // Solo actualizar el nombre si está vacío Y no se aplicó conocimiento del CAT.NO.
      if (!updatedFormData.toolName && !catNoKnowledgeApplied) {
        updatedFormData.toolName = normalizedData.area3.trim();
        fieldsUpdated = true;
      }
    }

    setFormData(updatedFormData);
    setIsOcrModalOpen(false);

    if (fieldsUpdated) {
      const extractedInfo = [];
      if (normalizedData.area1) extractedInfo.push(`CAT NO: ${normalizedData.area1}`);
      if (normalizedData.area2) extractedInfo.push(`Serial: ${normalizedData.area2}`);
      if (catNoKnowledgeApplied) {
        extractedInfo.push(`Nombre: ${updatedFormData.toolName} (desde base de conocimiento)`);
      } else if (normalizedData.area3) {
        extractedInfo.push(`Info: ${normalizedData.area3}`);
      }
      
      toast({
        title: catNoKnowledgeApplied ? "OCR + Conocimiento Aplicado" : "Datos de OCR Aplicados",
        description: `${extractedInfo.join(', ')}`,
      });
    } else {
       let message = "No se pudo extraer información útil de la imagen.";
       if (normalizedData.error) {
           message = `Error en OCR: ${normalizedData.error}`;
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

    for (let i = 0; i < formData.fotos.length; i++) {
        const file = formData.fotos[i];
        const previewUrl = selectedImagePreviews[i];
        const reader = new FileReader();
        const promise = new Promise<HerramientaFoto>((resolve, reject) => {
            reader.onload = (e) => {
                resolve({
                    id: `foto_${Date.now()}_${Math.random().toString(36).substring(2,5)}`,
                    url: e.target?.result as string,
                    name: file.name,
                    rotation: newPhotoRotations[previewUrl] || 0,
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
      serialNumber: formData.serialNumber?.trim() || null,
      precio: formData.precio != null && String(formData.precio).trim() !== '' ? parseFloat(String(formData.precio)) : null,
      falla: formData.falla?.trim() || null,
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
      // "Learn" the CAT.NO. to Tool Name mapping
      if (herramientaData.catNo && herramientaData.toolName) {
        await saveCatNoKnowledge(herramientaData.catNo, herramientaData.toolName);
      }
      
      // "Learn" the warranty rule from manual input if it's a new CAT.NO. rule
      if (herramientaData.catNo && herramientaData.anosGarantia !== null) {
        const existingRules = await getCustomWarrantyRules();
        const ruleExistsForCatNo = existingRules.some(r => r.catNo.toUpperCase() === herramientaData.catNo!.toUpperCase());

        if (!ruleExistsForCatNo) {
          const newRuleData: Omit<WarrantyRule, 'id'> = {
            catNo: herramientaData.catNo,
            years: herramientaData.anosGarantia,
            description: `Regla auto-guardada desde formulario para: ${herramientaData.toolName || herramientaData.catNo}`,
            isLifetime: herramientaData.anosGarantia === null, // Consider it lifetime if years is null
          };
          await addCustomWarrantyRule(newRuleData);
          toast({ title: "Nueva Regla Aprendida", description: `Se guardó la garantía de ${herramientaData.anosGarantia} años para CAT.NO. ${herramientaData.catNo}.`});
        }
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
    // Revoke any pending preview URLs before switching
    selectedImagePreviews.forEach(url => URL.revokeObjectURL(url));
    setNewPhotoRotations({});
    setEditingHerramientaId(herramienta.id);
    setFormData({
      catNo: herramienta.catNo,
      toolName: herramienta.toolName,
      serialNumber: herramienta.serialNumber || '',
      precio: herramienta.precio ?? null,
      falla: herramienta.falla || '',
      anosGarantia: herramienta.anosGarantia?.toString() || '',
      fechaVencimientoGarantia: herramienta.fechaVencimientoGarantia,
      fechaMilwaukee: null, // Reset Milwaukee date for editing
      fotos: [], // New photos to be added
      currentFotos: herramienta.fotos || [], // Existing photos
      estado: herramienta.estado,
      condicion: herramienta.condicion || 'Usada', // Default to 'Usada' for old items
    });
    setSelectedImagePreviews([]); // Clear previews for new files
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const openStatusChangeModal = (herramienta: Herramienta) => {
      setToolToChangeStatus(herramienta);
      setNewStatusForTool(herramienta.estado);
  };

  const handleConfirmStatusChange = async () => {
    if (!toolToChangeStatus || !newStatusForTool) return;

    setIsSubmittingForm(true);
    const updatedTool = { ...toolToChangeStatus, estado: newStatusForTool };

    // If changing from "Vendido", clear sale date if needed
    if (toolToChangeStatus.estado === 'Vendido' && newStatusForTool !== 'Vendido') {
        updatedTool.fechaVenta = null;
    }

    const success = await updateHerramienta(updatedTool);
    if (success) {
        toast({ title: "Estado Actualizado", description: `El estado de '${updatedTool.toolName}' es ahora '${newStatusForTool}'.` });
        await fetchAllData();
    } else {
        toast({ title: "Error", description: "No se pudo actualizar el estado de la herramienta.", variant: "destructive" });
    }
    
    setToolToChangeStatus(null);
    setNewStatusForTool('');
    setIsSubmittingForm(false);
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

  // --- Image Viewer Modal Logic ---
  const openImageInModal = (imageData: { url: string; id: string; type: 'current' | 'new'; index?: number; name?: string; rotation?: number }) => {
    setImageToView(imageData);
    setModalZoom(1);
    setModalRotation(imageData.rotation || 0);
  };

  const closeImageModal = () => {
    if (imageToView && modalRotation !== (imageToView.rotation || 0)) {
        if (imageToView.type === 'current') {
            setFormData(prev => {
                const updatedCurrentFotos = prev.currentFotos.map(photo =>
                    photo.id === imageToView.id ? { ...photo, rotation: modalRotation } : photo
                );
                return { ...prev, currentFotos: updatedCurrentFotos };
            });
        } else if (imageToView.type === 'new') {
            setNewPhotoRotations(prev => ({
                ...prev,
                [imageToView.url]: modalRotation,
            }));
        }
    }
    setImageToView(null);
    setIsMaximized(false);
  };

  const handleModalZoomIn = () => setModalZoom(prev => Math.min(prev + 0.2, 3.0));
  const handleModalZoomOut = () => setModalZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleModalRotate = () => setModalRotation(prev => (prev + 90) % 360);
  const handleToggleMaximize = () => setIsMaximized(prev => !prev);


  const sanitizeFilename = (name: string): string => {
    if (!name) return '';
    return name.replace(/[\s/\\?%*:|"<>]/g, '_').substring(0, 100);
  };

  const handleModalDownload = () => {
    if (!imageToView) return;
    const catNo = formData.catNo.trim();
    const serialNo = formData.serialNumber?.trim() || '';
    let filename = `loma-tool_${imageToView.id}.jpeg`;

    if (catNo && serialNo) {
      filename = `${sanitizeFilename(serialNo)}_${sanitizeFilename(catNo)}.jpeg`;
    } else if (serialNo) {
      filename = `${sanitizeFilename(serialNo)}.jpeg`;
    } else if (catNo) {
      filename = `${sanitizeFilename(catNo)}.jpeg`;
    }

    const link = document.createElement('a');
    link.href = imageToView.url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Descarga Iniciada", description: `Se está descargando ${filename}.` });
  };
  
  const handleModalDelete = () => {
    if (!imageToView) return;
    if (imageToView.type === 'current') {
      removeCurrentFoto(imageToView.id);
    } else if (imageToView.type === 'new' && imageToView.index !== undefined) {
      removeSelectedPreview(imageToView.index);
    }
    toast({ title: "Imagen Eliminada", description: "La foto ha sido eliminada del formulario." });
    closeImageModal();
  };

  const getWarrantyDetailsForTable = (herramienta: Herramienta) => {
    const toolName = herramienta.toolName ?? '';
    const catNo = herramienta.catNo ?? '';
    const warrantyInfo = estimateWarrantyFromSerialNumber(
      herramienta.serialNumber,
      toolName,
      catNo,
      customWarrantyRules,
      herramienta.fechaVencimientoGarantia
    );
    const periodDetails = determineWarrantyPeriod(
      toolName,
      catNo,
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
    let isExpiringSoon = false;
    let daysUntilExpiration: number | null = null;

    if (warrantyInfo.status === 'Activa' && warrantyInfo.expirationDate) {
      try {
        const expDate = parseISO(warrantyInfo.expirationDate); 
        if (isValid(expDate)) {
          daysUntilExpiration = differenceInDays(expDate, new Date());
          if (daysUntilExpiration >= 0 && daysUntilExpiration <= 30) {
              isExpiringSoon = true;
          }
          tiempoRestanteText = formatDistanceStrict(expDate, new Date(), { locale: es, addSuffix: false }) + " restantes";
        }
      } catch (e) {
        console.error("Error parsing expiration date for time remaining:", e);
        tiempoRestanteText = "Error al calcular";
      }
    } else if (warrantyInfo.status === 'Expirada') {
      tiempoRestanteText = "Expirada";
    } else if (warrantyInfo.status === 'Vitalicia' || (warrantyInfo.status === 'Regla Manual' && periodDetails.isLifetime)) {
      tiempoRestanteText = "Vitalicia";
    } else if (warrantyInfo.status === 'No Estimable' || warrantyInfo.status === 'Error' || warrantyInfo.status === 'Desconocida') {
        tiempoRestanteText = warrantyInfo.status;
    } else if (warrantyInfo.status === 'Regla Manual' && warrantyDurationText === "0 años"){
        tiempoRestanteText = "Sin garantía";
    }

    const expForDisplay = warrantyInfo.expirationDate
      ? parseISO(warrantyInfo.expirationDate)
      : null;
    const expirationDateFormatted =
      expForDisplay && isValid(expForDisplay)
        ? format(expForDisplay, "PPP", { locale: es })
        : 'N/A';

    return {
      status: warrantyInfo.status,
      expirationDate: expirationDateFormatted,
      duration: warrantyDurationText,
      remaining: tiempoRestanteText,
      bgColor: getWarrantyStatusBgColor(warrantyInfo.status),
      estimationDetails: warrantyInfo.estimationDetails || null,
      ruleSource: warrantyInfo.ruleSource,
      isExpiringSoon,
      daysUntilExpiration,
    };
  };

  const requestSort = (key: keyof Herramienta) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const filteredAndSortedHerramientas = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();

    const filtered = herramientasList.filter(item => 
      item.estado !== 'Vendido' && (
        String(item.toolName ?? '').toLowerCase().includes(lowercasedFilter) ||
        String(item.catNo ?? '').toLowerCase().includes(lowercasedFilter) ||
        (item.serialNumber && String(item.serialNumber).toLowerCase().includes(lowercasedFilter))
      )
    );
    
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
  
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return filtered;
  }, [herramientasList, searchTerm, sortConfig]);


  const SortableHeader = ({ sortKey, label }: { sortKey: keyof Herramienta; label: string }) => (
    <Button variant="ghost" onClick={() => requestSort(sortKey)} className="pl-0 pr-2 hover:bg-transparent">
      {label}
      {sortConfig.key === sortKey ? (
        sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
      ) : null}
    </Button>
  );
  
  const handlePhotoModalClose = () => {
    setToolToViewPhotos(null);
    setImageToMaximize(null);
  };

  /** Cargar herramienta completa (con fotos) por ID antes de abrir el modal de detalles. */
  const openToolDetails = async (h: Herramienta) => {
    const full = await getHerramientaById(h.id);
    setToolToViewDetails(full ?? h);
  };

  /** Cargar herramienta completa (con fotos) por ID antes de abrir el modal de fotos. */
  const openToolPhotos = async (h: Herramienta) => {
    const full = await getHerramientaById(h.id);
    setToolToViewPhotos(full ?? h);
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
              <div className="flex justify-between items-center mb-1">
                 <Label htmlFor="catNo">CAT.NO. <span className="text-destructive">*</span></Label>
                 {isNewCatNo && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    ¡Nuevo en la Base de Conocimiento!
                  </span>
                 )}
              </div>
              <Input id="catNo" name="catNo" value={formData.catNo} onChange={handleInputChange} placeholder="Ej: 2767-20" required disabled={isSubmittingForm}/>
            </div>
            <div>
              <Label htmlFor="toolName">Nombre Herramienta <span className="text-destructive">*</span></Label>
              <Input id="toolName" name="toolName" value={formData.toolName} onChange={handleInputChange} placeholder="Ej: M18 FUEL Impact Driver" required disabled={isSubmittingForm}/>
            </div>
            <div className={cn(formData.estado === 'Requiere Reparación' && "md:col-span-2")}>
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input id="serialNumber" name="serialNumber" value={formData.serialNumber ?? ''} onChange={handleInputChange} placeholder="Ej: X123456789" disabled={isSubmittingForm}/>
              {duplicationWarning && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Número de Serie Duplicado</AlertTitle>
                  <AlertDescription>
                    {duplicationWarning}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            {formData.estado !== 'Requiere Reparación' && (
              <div>
                <Label htmlFor="precio">Precio (USD)</Label>
                <Input id="precio" name="precio" type="number" value={formData.precio ?? ''} onChange={handleInputChange} placeholder="Ej: 199.99" step="0.01" min="0" disabled={isSubmittingForm}/>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div>
                <Label htmlFor="condicion">Condición <span className="text-destructive">*</span></Label>
                <Select name="condicion" value={formData.condicion} onValueChange={(value) => handleSelectChange('condicion', value)} required disabled={isSubmittingForm}>
                  <SelectTrigger id="condicion">
                    <SelectValue placeholder="Selecciona una condición" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nueva">Nueva</SelectItem>
                    <SelectItem value="Usada">Usada</SelectItem>
                    <SelectItem value="Usada (Reparada)">Usada (Reparada)</SelectItem>
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
              <Textarea id="falla" name="falla" value={formData.falla || ''} onChange={handleInputChange} placeholder="Describe la falla de la herramienta" rows={2} disabled={isSubmittingForm}/>
            </div>
            
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <Label htmlFor="anosGarantia">Años de Garantía (Ej: 3, 5)</Label>
                  <Input id="anosGarantia" name="anosGarantia" type="number" value={formData.anosGarantia || ''} onChange={handleInputChange} placeholder="Ej: 5" min="0" disabled={isSubmittingForm}/>
                </div>
                <div>
                  <Label htmlFor="fechaVencimientoGarantia">Fecha Vencimiento Garantía</Label>
                    <Popover open={isCalendarOpen} onOpenChange={handleCalendarOpenChange}>
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
                                selected={tempCalendarDate}
                                onSelect={handleDateChange}
                                initialFocus
                                locale={es}
                                captionLayout="dropdown-buttons"
                                fromYear={2010}
                                toYear={new Date().getFullYear() + 10}
                            />
                            <div className="flex justify-end gap-2 p-2 border-t">
                                <Button variant="outline" size="sm" onClick={() => setIsCalendarOpen(false)}>Cancelar</Button>
                                <Button size="sm" onClick={handleAcceptDate}>Aceptar</Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor="fechaMilwaukee">Fecha Milwaukee</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Fecha real consultada en Milwaukee.com para aprendizaje</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Popover open={isMilwaukeeCalendarOpen} onOpenChange={handleMilwaukeeCalendarOpenChange}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.fechaMilwaukee && "text-muted-foreground"
                        )}
                        disabled={isSubmittingForm}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {formData.fechaMilwaukee ? format(isoStringToDate(formData.fechaMilwaukee)!, "PPP", { locale: es }) : <span>Fecha de Milwaukee</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tempMilwaukeeDate}
                        onSelect={setTempMilwaukeeDate}
                        initialFocus
                        locale={es}
                        captionLayout="dropdown-buttons"
                        fromYear={2010}
                        toYear={new Date().getFullYear() + 10}
                      />
                      <div className="flex justify-end gap-2 p-2 border-t">
                        <Button variant="outline" size="sm" onClick={() => setIsMilwaukeeCalendarOpen(false)}>Cancelar</Button>
                        <Button size="sm" onClick={handleAcceptMilwaukeeDate}>Aceptar</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {/* Botón de Guardar Regla - MÁS VISIBLE */}
              {formData.catNo.trim() && formData.anosGarantia && (
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuickRuleModal(true)}
                    disabled={isSubmittingForm}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Guardar como Regla Personalizada
                  </Button>
                </div>
              )}
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
                             {estimatedWarrantyInfo.expirationDate && ` (Vence: ${format(parseISO(estimatedWarrantyInfo.expirationDate), "PPP", { locale: es })})`}
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
                                onClick={() => !isSubmittingForm && openImageInModal({ url: foto.url, id: foto.id, name: foto.name, type: 'current', rotation: foto.rotation })}
                                data-ai-hint="tool image"
                                style={{ transform: `rotate(${foto.rotation || 0}deg)` }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <Eye className="h-8 w-8 text-white" />
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
                                onClick={() => !isSubmittingForm && openImageInModal({ url: previewUrl, id: `new_${index}`, name: formData.fotos[index]?.name, type: 'new', index, rotation: newPhotoRotations[previewUrl] || 0 })}
                                data-ai-hint="tool image"
                                style={{ transform: `rotate(${newPhotoRotations[previewUrl] || 0}deg)` }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <Eye className="h-8 w-8 text-white" />
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
            <Button type="submit" disabled={isSubmittingForm || !!duplicationWarning}>
              {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (editingHerramientaId ? <><Edit3 className="mr-2 h-4 w-4" /> Guardar Cambios</> : <><PlusCircle className="mr-2 h-4 w-4" /> Agregar Herramienta</>)}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wrench className="h-6 w-6" />
              <CardTitle>Inventario de Herramientas</CardTitle>
              {!isLoadingHerramientas && (
                <span className="text-sm font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                  {filteredAndSortedHerramientas.length} / {herramientasList.filter(h => h.estado !== 'Vendido').length}
                </span>
              )}
            </div>
          </div>
          <CardDescription>
            Visualiza, busca y edita herramientas operativas o en reparación. Las vendidas se ven en su propia sección.
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
          {isLoadingHerramientas ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Cargando herramientas...</p>
            </div>
          ) : filteredAndSortedHerramientas.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              {searchTerm ? 'No se encontraron herramientas que coincidan.' : 'No hay herramientas registradas en el inventario.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><SortableHeader sortKey="catNo" label="CAT.NO." /></TableHead>
                    <TableHead><SortableHeader sortKey="toolName" label="Nombre" /></TableHead>
                    <TableHead>Estado Herr.</TableHead>
                    <TableHead><SortableHeader sortKey="fechaAgregado" label="Registrado" /></TableHead>
                    <TableHead>Garantía (Est./Vence)</TableHead>
                    <TableHead className="text-center">Fotos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedHerramientas.map((h) => {
                    const warrantyDetails = getWarrantyDetailsForTable(h);
                    const fechaAgregadoParsed = h.fechaAgregado ? parseISO(h.fechaAgregado) : null;
                    const fechaAgregadoLabel =
                      fechaAgregadoParsed && isValid(fechaAgregadoParsed)
                        ? format(fechaAgregadoParsed, 'PP', { locale: es })
                        : 'N/A';
                    return (
                      <TableRow key={h.id} className={cn(warrantyDetails.isExpiringSoon && "bg-orange-50 dark:bg-orange-900/20")}>
                        <TableCell className="font-medium whitespace-nowrap">{h.catNo ?? ''}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate" title={h.toolName}>{h.toolName ?? ''}</TableCell>
                        <TableCell>
                          <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap",
                              h.estado === 'Operativa' && 'bg-success text-success-foreground',
                              h.estado === 'Requiere Reparación' && 'bg-destructive text-destructive-foreground'
                              )}>
                              {h.estado}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                            {fechaAgregadoLabel}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                           <Tooltip>
                              <TooltipTrigger asChild>
                                  <div className="flex flex-col items-start cursor-help">
                                    <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full flex items-center", warrantyDetails.isExpiringSoon ? "bg-orange-500 text-white" : warrantyDetails.bgColor)}>
                                      {warrantyDetails.ruleSource === 'custom' && <ShieldCheck className="h-3 w-3 mr-1.5 flex-shrink-0" />}
                                      {warrantyDetails.isExpiringSoon && <AlertTriangle className="h-3 w-3 mr-1.5 flex-shrink-0" />}
                                      {warrantyDetails.status}
                                      {warrantyDetails.duration !== "N/A" && warrantyDetails.duration !== "Vitalicia" && ` (${warrantyDetails.duration})`}
                                    </span>
                                    {warrantyDetails.status !== "Vitalicia" && warrantyDetails.status !== "No Estimable" && warrantyDetails.status !== "Error" && warrantyDetails.status !== "Desconocida" && warrantyDetails.expirationDate !== 'N/A' && (
                                      <span className="mt-1 text-xs text-muted-foreground">Vence: {warrantyDetails.expirationDate}</span>
                                    )}
                                  </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                    {warrantyDetails.isExpiringSoon && (
                                        <p className="font-bold text-orange-600 dark:text-orange-400">
                                            Vence en {warrantyDetails.daysUntilExpiration} día{warrantyDetails.daysUntilExpiration === 1 ? '' : 's'}.
                                        </p>
                                    )}
                                    <p><strong>Duración:</strong> {warrantyDetails.duration}</p>
                                    <p><strong>Restante:</strong> {warrantyDetails.remaining}</p>
                                    {warrantyDetails.estimationDetails && (
                                        <p className="text-xs text-muted-foreground border-t border-border pt-1 mt-1">
                                            {warrantyDetails.estimationDetails}
                                        </p>
                                    )}
                                </div>
                              </TooltipContent>
                           </Tooltip>
                        </TableCell>
                        <TableCell className="text-center">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openToolPhotos(h)}
                                title="Ver fotos (se cargan al abrir)"
                            >
                                <CameraIcon className="h-4 w-4" />
                                <span className="ml-1 text-xs">Fotos</span>
                            </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openToolDetails(h)} title="Ver Detalles" disabled={isSubmittingForm}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openStatusChangeModal(h)} title="Cambiar Estado" disabled={isSubmittingForm}>
                            <RotateCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditHerramienta(h)} title="Editar" disabled={isSubmittingForm}>
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
      
       {toolToChangeStatus && (
        <Dialog open={!!toolToChangeStatus} onOpenChange={(open) => !open && setToolToChangeStatus(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Cambiar Estado de: {toolToChangeStatus.toolName}</DialogTitle>
                    <DialogDescription>
                        Actualiza el estado de la herramienta. Esto es útil para marcar herramientas como operativas después de una reparación.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="new-status-select">Nuevo Estado</Label>
                    <Select value={newStatusForTool} onValueChange={(value) => setNewStatusForTool(value as Herramienta['estado'])}>
                        <SelectTrigger id="new-status-select">
                            <SelectValue placeholder="Selecciona un estado..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Operativa">Operativa</SelectItem>
                            <SelectItem value="Requiere Reparación">Requiere Reparación</SelectItem>
                            <SelectItem value="Vendido">Vendido</SelectItem>
                        </SelectContent>
                    </Select>
                     {newStatusForTool === 'Operativa' && toolToChangeStatus.estado === 'Requiere Reparación' && (
                        <p className="text-xs text-muted-foreground pt-2">
                           Sugerencia: Si la herramienta fue reparada, considera cambiar también su "Condición" a "Usada (Reparada)" editando la herramienta.
                        </p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setToolToChangeStatus(null)} disabled={isSubmittingForm}>Cancelar</Button>
                    <Button onClick={handleConfirmStatusChange} disabled={isSubmittingForm || !newStatusForTool || newStatusForTool === toolToChangeStatus.estado}>
                        {isSubmittingForm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Cambio
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      {toolToViewPhotos && (
        <Dialog open={!!toolToViewPhotos} onOpenChange={(open) => !open && handlePhotoModalClose()}>
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
                    <Button variant="outline" onClick={handlePhotoModalClose}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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

      {imageToView && (
        <Dialog open={!!imageToView} onOpenChange={(open) => !open && closeImageModal()}>
          <DialogContent
            className={cn(
              "flex flex-col p-0 overflow-hidden shadow-2xl transition-all duration-300",
              isMaximized 
                ? "w-screen h-screen max-w-full max-h-full rounded-none border-none" 
                : "max-w-4xl w-[95vw] h-[90vh] sm:rounded-lg border"
            )}
            onInteractOutside={(e) => {
              if (isMaximized) {
                e.preventDefault();
              }
            }}
          >
            <DialogHeader className="p-4 border-b flex-shrink-0 flex flex-row items-center justify-between">
              <DialogTitle className="truncate">Vista Previa: {imageToView.name || imageToView.id}</DialogTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={handleToggleMaximize} className="text-muted-foreground hover:text-foreground">
                  {isMaximized ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                  <span className="sr-only">{isMaximized ? 'Restaurar' : 'Maximizar'}</span>
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-grow relative bg-muted/50 overflow-hidden flex items-center justify-center p-2">
              <Image
                key={imageToView.url}
                src={imageToView.url}
                alt={imageToView.name || 'Vista ampliada de foto'}
                layout="fill"
                objectFit="contain"
                className="transition-transform duration-200 ease-in-out"
                style={{ transform: `scale(${modalZoom}) rotate(${modalRotation}deg)` }}
                data-ai-hint="large preview"
              />
            </div>
            <DialogFooter className="p-3 border-t flex-col sm:flex-row gap-2 justify-between bg-background">
                <div className="flex gap-2 items-center justify-center sm:justify-start">
                    <Button variant="outline" size="icon" onClick={handleModalZoomOut} disabled={modalZoom <= 0.5} aria-label="Alejar">
                        <ZoomOut className="h-4 w-4"/>
                    </Button>
                    <span className="text-sm font-semibold w-12 text-center">{Math.round(modalZoom * 100)}%</span>
                     <Button variant="outline" size="icon" onClick={handleModalZoomIn} disabled={modalZoom >= 3.0} aria-label="Acercar">
                        <ZoomIn className="h-4 w-4"/>
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleModalRotate} aria-label="Girar Imagen">
                        <RotateCw className="h-4 w-4"/>
                    </Button>
                </div>
                 <div className="flex gap-2 items-center justify-center sm:justify-end">
                     <Button variant="outline" onClick={handleModalDownload}>
                        <Download className="mr-2 h-4 w-4"/> Descargar
                     </Button>
                     <Button variant="destructive" onClick={handleModalDelete}>
                        <Trash2 className="mr-2 h-4 w-4"/> Eliminar
                     </Button>
                </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    {/* Learning Confirmation Modal */}
    {showLearningPrompt && learningData && (
      <AlertDialog open={showLearningPrompt} onOpenChange={setShowLearningPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              ¿Guardar Aprendizaje?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div>Se detectó una diferencia entre la fecha calculada automáticamente y la fecha real de Milwaukee:</div>
                <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                  <div><strong>CAT.NO:</strong> {learningData?.catNo}</div>
                  <div><strong>Fecha Calculada:</strong> {learningData?.fechaCalculada && format(parseISO(learningData.fechaCalculada), "PPP", { locale: es })}</div>
                  <div><strong>Fecha Milwaukee:</strong> {learningData?.fechaMilwaukee && format(parseISO(learningData.fechaMilwaukee), "PPP", { locale: es })}</div>
                  <div><strong>Diferencia:</strong> {learningData?.fechaMilwaukee && learningData?.fechaCalculada && Math.round((new Date(learningData.fechaMilwaukee).getTime() - new Date(learningData.fechaCalculada).getTime()) / (1000 * 60 * 60 * 24))} días</div>
                </div>
                <div>¿Quieres que la app aprenda de esta corrección para mejorar futuras estimaciones de este CAT.NO?</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowLearningPrompt(false); setLearningData(null); }}>
              No Guardar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveLearning}>
              Sí, Guardar Aprendizaje
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}

    {/* Quick Rule Creation Modal */}
    {showQuickRuleModal && (() => {
      const existingRule = customWarrantyRules.find(
        rule => rule.catNo.toUpperCase() === formData.catNo.trim().toUpperCase()
      );
      
      return (
        <AlertDialog open={showQuickRuleModal} onOpenChange={setShowQuickRuleModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {existingRule ? 'Actualizar Regla de Garantía' : 'Crear Regla de Garantía'}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  {existingRule ? (
                    <>
                      <div className="text-amber-600 dark:text-amber-400 font-medium">
                        ⚠️ Ya existe una regla para este CAT.NO.
                      </div>
                      <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                        <div><strong>CAT.NO:</strong> {formData.catNo}</div>
                        <div><strong>Nombre:</strong> {formData.toolName || 'Sin nombre'}</div>
                        <div className="flex items-center gap-2">
                          <span><strong>Años Actuales:</strong> {existingRule.years} años</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-primary font-semibold"><strong>Nuevos:</strong> {formData.anosGarantia} años</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ¿Deseas actualizar la regla existente? Esto afectará a todas las futuras herramientas con este CAT.NO.
                      </div>
                    </>
                  ) : (
                    <>
                      <div>¿Deseas crear una regla personalizada de garantía con estos datos?</div>
                      <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                        <div><strong>CAT.NO:</strong> {formData.catNo}</div>
                        <div><strong>Nombre:</strong> {formData.toolName || 'Sin nombre'}</div>
                        <div><strong>Años de Garantía:</strong> {formData.anosGarantia} años</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Esta regla se aplicará automáticamente a todas las futuras herramientas con este CAT.NO.
                      </div>
                    </>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowQuickRuleModal(false)} disabled={isCreatingQuickRule}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleCreateQuickRule} disabled={isCreatingQuickRule}>
                {isCreatingQuickRule && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existingRule ? 'Actualizar Regla' : 'Crear Regla'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    })()}

    {/* CAT.NO. Correction Modal */}
    {showCorrectionModal && pendingOcrData && (
      <AlertDialog open={showCorrectionModal} onOpenChange={setShowCorrectionModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              CAT.NO. Nuevo Detectado
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div>Se detectó un CAT.NO. nuevo que no está en la base de conocimiento:</div>
                <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                  <div><strong>CAT.NO:</strong> {pendingOcrData?.area1}</div>
                  <div><strong>Serial:</strong> {pendingOcrData?.area2}</div>
                  <div><strong>Descripción:</strong> {pendingOcrData?.area3}</div>
                </div>
                <div>¿Quieres revisar y corregir esta información antes de guardarla?</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipCorrection}>
              Usar Como Está
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCorrection}>
              Revisar y Corregir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}

    {/* Modal de Detalles de Herramienta */}
    {toolToViewDetails && (
      <Dialog open={!!toolToViewDetails} onOpenChange={(open) => !open && setToolToViewDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detalles de Herramienta
            </DialogTitle>
            <DialogDescription>
              Información completa de {toolToViewDetails.toolName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Información Básica */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">CAT.NO.</Label>
                <p className="font-mono text-sm mt-1">{toolToViewDetails.catNo}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Número de Serie</Label>
                <p className="font-mono text-sm mt-1">{toolToViewDetails.serialNumber || "N/A"}</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Nombre de Herramienta</Label>
              <p className="text-sm mt-1">{toolToViewDetails.toolName}</p>
            </div>

            {/* Estado y Condición */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                <div className="mt-1">
                  <span className={cn("px-2 py-1 text-xs font-semibold rounded-full",
                    toolToViewDetails.estado === 'Operativa' && 'bg-success text-success-foreground',
                    toolToViewDetails.estado === 'Requiere Reparación' && 'bg-destructive text-destructive-foreground'
                  )}>
                    {toolToViewDetails.estado}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Condición</Label>
                <p className="text-sm mt-1">{toolToViewDetails.condicion}</p>
              </div>
            </div>

            {/* Falla/Descripción */}
            {toolToViewDetails.falla && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Falla Reportada</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{toolToViewDetails.falla}</p>
                </div>
              </div>
            )}

            {/* Precio */}
            {toolToViewDetails.precio && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Precio</Label>
                <p className="text-sm mt-1 font-medium">${toolToViewDetails.precio.toLocaleString()}</p>
              </div>
            )}

            {/* Garantía */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Años de Garantía</Label>
                <p className="text-sm mt-1">{toolToViewDetails.anosGarantia || "N/A"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Vencimiento de Garantía</Label>
                <p className="text-sm mt-1">
                  {toolToViewDetails.fechaVencimientoGarantia 
                    ? format(parseISO(toolToViewDetails.fechaVencimientoGarantia), 'PPP', { locale: es })
                    : "N/A"
                  }
                </p>
              </div>
            </div>

            {/* Fecha de Registro */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Fecha de Registro</Label>
              <p className="text-sm mt-1">
                {toolToViewDetails.fechaAgregado 
                  ? format(parseISO(toolToViewDetails.fechaAgregado), 'PPPp', { locale: es })
                  : "N/A"
                }
              </p>
            </div>

            {/* Fotos */}
            {toolToViewDetails.fotos && toolToViewDetails.fotos.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Fotos ({toolToViewDetails.fotos.length})
                </Label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {toolToViewDetails.fotos.slice(0, 4).map((foto, index) => (
                    <div key={foto.id} className="relative aspect-square group">
                      <Image
                        src={foto.url}
                        alt={foto.name || `Foto ${index + 1}`}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-md cursor-pointer"
                        onClick={() => setToolToViewPhotos(toolToViewDetails)}
                        style={{ transform: `rotate(${foto.rotation || 0}deg)` }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  ))}
                  {toolToViewDetails.fotos.length > 4 && (
                    <div 
                      className="aspect-square bg-muted rounded-md flex items-center justify-center cursor-pointer hover:bg-muted/80"
                      onClick={() => setToolToViewPhotos(toolToViewDetails)}
                    >
                      <span className="text-xs text-muted-foreground">+{toolToViewDetails.fotos.length - 4}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setToolToViewDetails(null)}>
              Cerrar
            </Button>
            <Button onClick={() => {
              setToolToViewDetails(null);
              handleEditHerramienta(toolToViewDetails);
            }}>
              <Edit3 className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </div>
    </TooltipProvider>
  );
}