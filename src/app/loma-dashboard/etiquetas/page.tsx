
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Tag as LabelIcon, Save, Settings, Ruler, LayoutTemplate, Loader2, Text, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, BoxSelect, MoveHorizontal, MoveVertical, BadgeDollarSign, ShieldHalf } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
    getLabelSettings,
    saveLabelSettings,
    defaultLabelSettings,
    AVAILABLE_FIELDS,
    type LabelSettings,
    type LabelField,
    type LabelUnit,
    type LabelStructure,
    type LabelQrPosition,
    type LabelTextAlign,
} from '@/lib/label-settings-storage';
import { LabelPreview, sampleTool } from '@/components/loma-dashboard/LabelPreview';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';


export default function EtiquetasPage() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<LabelSettings>(defaultLabelSettings);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadedSettings = getLabelSettings();
        setSettings(loadedSettings);
        setIsLoading(false);
    }, []);

    const convertDimension = (value: number, fromUnit: LabelUnit, toUnit: LabelUnit): number => {
        if (fromUnit === toUnit) return value;
    
        // First, convert everything to a base unit (mm)
        let valueInMm: number;
        switch (fromUnit) {
            case 'cm':
                valueInMm = value * 10;
                break;
            case 'in':
                valueInMm = value * 25.4;
                break;
            case 'mm':
            default:
                valueInMm = value;
                break;
        }
    
        // Then, convert from mm to the target unit
        let finalValue: number;
        switch (toUnit) {
            case 'cm':
                finalValue = valueInMm / 10;
                break;
            case 'in':
                finalValue = valueInMm / 25.4;
                break;
            case 'mm':
            default:
                finalValue = valueInMm;
                break;
        }
    
        // Round to a reasonable number of decimal places to avoid floating point issues
        // Use more precision for inches
        const precision = toUnit === 'in' ? 3 : 2;
        const roundedValue = parseFloat(finalValue.toFixed(precision));
        // Remove trailing zeros from decimal part by converting to Number
        return Number(roundedValue.toString());
    };

    const handleFieldChange = (fieldId: LabelField, checked: boolean) => {
        setSettings(prev => {
            const currentFields = new Set(prev.fields);
            if (checked) {
                currentFields.add(fieldId);
            } else {
                currentFields.delete(fieldId);
            }
            const newFields = AVAILABLE_FIELDS
                .map(f => f.id)
                .filter(id => currentFields.has(id));

            return { ...prev, fields: newFields };
        });
    };

    const handleDimensionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = value === '' ? 0 : parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            setSettings(prev => ({ ...prev, [name]: numValue }));
        }
    };
    
    const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = value === '' ? 0 : parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0) {
            setSettings(prev => ({ ...prev, [name]: numValue }));
        }
    };
    
    const handleSliderChange = (key: keyof LabelSettings) => (value: number[]) => {
        setSettings(prev => ({ ...prev, [key]: value[0] }));
    };

    const handleUnitChange = (newUnit: LabelUnit) => {
        setSettings(prev => {
            if (prev.unit === newUnit) {
                return prev;
            }
            const newWidth = convertDimension(prev.width, prev.unit, newUnit);
            const newHeight = convertDimension(prev.height, prev.unit, newUnit);
            
            return { 
                ...prev, 
                unit: newUnit,
                width: newWidth,
                height: newHeight,
            };
        });
    };

    const handleSettingChange = (key: keyof LabelSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };
    

    const handleSave = () => {
        if (settings.width <= 0 || settings.height <= 0) {
            toast({
                title: 'Dimensiones Inválidas',
                description: 'El ancho y alto de la etiqueta deben ser mayores a 0.',
                variant: 'destructive',
            });
            return;
        }
        const success = saveLabelSettings(settings);
        if (success) {
            toast({
                title: 'Plantilla Guardada',
                description: 'Tus ajustes para las etiquetas han sido guardados.',
            });
        } else {
            toast({
                title: 'Error al Guardar',
                description: 'No se pudo guardar la plantilla de etiquetas.',
                variant: 'destructive',
            });
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Ruler className="h-6 w-6 text-primary" />
                           Dimensiones y Unidades
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <Label htmlFor="width">Ancho</Label>
                                <Input id="width" name="width" type="number" value={settings.width} onChange={handleDimensionChange} placeholder="90" step="0.01" />
                            </div>
                            <div>
                                <Label htmlFor="height">Alto</Label>
                                <Input id="height" name="height" type="number" value={settings.height} onChange={handleDimensionChange} placeholder="29" step="0.01" />
                            </div>
                        </div>
                        <div>
                             <Label htmlFor="unit">Unidades</Label>
                             <Select value={settings.unit} onValueChange={handleUnitChange}>
                                 <SelectTrigger id="unit"><SelectValue placeholder="Selecciona unidad" /></SelectTrigger>
                                 <SelectContent>
                                     <SelectItem value="mm">Milímetros (mm)</SelectItem>
                                     <SelectItem value="cm">Centímetros (cm)</SelectItem>
                                     <SelectItem value="in">Pulgadas (in)</SelectItem>
                                 </SelectContent>
                             </Select>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-6 w-6 text-primary" />
                            Campos a Incluir
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3">
                         {AVAILABLE_FIELDS.map(field => (
                            <div key={field.id} className="flex items-center space-x-2">
                                <Checkbox id={field.id} checked={settings.fields.includes(field.id)} onCheckedChange={(checked) => handleFieldChange(field.id, Boolean(checked))} />
                                <label htmlFor={field.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{field.label}</label>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BoxSelect className="h-6 w-6 text-primary" />
                            Estructura y Posición
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Dirección Principal</Label>
                            <RadioGroup value={settings.structure} onValueChange={(v) => handleSettingChange('structure', v as LabelStructure)} className="flex gap-2">
                                <Label htmlFor="s-h" className="flex-1 text-center border rounded-md p-2 cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                                    <RadioGroupItem value="horizontal" id="s-h" className="sr-only"/>
                                    <MoveHorizontal className="mx-auto mb-1 h-5 w-5"/> Horizontal
                                </Label>
                                <Label htmlFor="s-v" className="flex-1 text-center border rounded-md p-2 cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                                    <RadioGroupItem value="vertical" id="s-v" className="sr-only"/>
                                    <MoveVertical className="mx-auto mb-1 h-5 w-5"/> Vertical
                                </Label>
                            </RadioGroup>
                        </div>
                        <div className="space-y-2">
                            <Label>Posición del Código QR</Label>
                             <RadioGroup value={settings.qrPosition} onValueChange={(v) => handleSettingChange('qrPosition', v as LabelQrPosition)} className="grid grid-cols-2 gap-2">
                                <Label htmlFor="qr-start" className="border rounded-md p-2 text-center cursor-pointer has-[:checked]:bg-muted has-[:checked]:border-primary">
                                    <RadioGroupItem value="start" id="qr-start" className="sr-only"/>
                                    Al Inicio
                                    <span className="block text-xs text-muted-foreground">({settings.structure === 'horizontal' ? 'Izquierda' : 'Arriba'})</span>
                                </Label>
                                 <Label htmlFor="qr-end" className="border rounded-md p-2 text-center cursor-pointer has-[:checked]:bg-muted has-[:checked]:border-primary">
                                    <RadioGroupItem value="end" id="qr-end" className="sr-only"/>
                                    Al Final
                                    <span className="block text-xs text-muted-foreground">({settings.structure === 'horizontal' ? 'Derecha' : 'Abajo'})</span>
                                </Label>
                            </RadioGroup>
                        </div>
                         <div className="space-y-2">
                            <Label>Alineación del Texto</Label>
                            <RadioGroup
                                value={settings.textAlign}
                                onValueChange={(v) => handleSettingChange('textAlign', v as LabelTextAlign)}
                                className="grid grid-cols-3 gap-2"
                            >
                                <Label htmlFor="align-left" className="border rounded-md p-2 cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary flex flex-col items-center justify-center gap-1">
                                    <RadioGroupItem value="left" id="align-left" className="sr-only" />
                                    <AlignLeft className="h-5 w-5"/>
                                </Label>
                                <Label htmlFor="align-center" className="border rounded-md p-2 cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary flex flex-col items-center justify-center gap-1">
                                    <RadioGroupItem value="center" id="align-center" className="sr-only" />
                                    <AlignCenter className="h-5 w-5"/>
                                </Label>
                                <Label htmlFor="align-right" className="border rounded-md p-2 cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary flex flex-col items-center justify-center gap-1">
                                    <RadioGroupItem value="right" id="align-right" className="sr-only" />
                                    <AlignRight className="h-5 w-5"/>
                                </Label>
                            </RadioGroup>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LayoutTemplate className="h-6 w-6 text-primary" />
                            Vista Previa en Vivo
                        </CardTitle>
                        <CardDescription>
                            La vista previa se actualizará para mostrar cómo se verá la etiqueta final con tus ajustes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="p-4 bg-muted rounded-md flex items-center justify-center min-h-[250px]">
                           <div className="transform scale-125">
                               <LabelPreview settings={settings} tool={sampleTool} />
                           </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                           La vista previa está escalada. La impresión final respetará las dimensiones y unidades seleccionadas.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Text className="h-6 w-6 text-primary" />Ajustes de Contenido</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-3 gap-2 items-center">
                            <Label htmlFor="fontSizeToolName" className="col-span-2">Fuente Nombre (px)</Label>
                            <Input id="fontSizeToolName" name="fontSizeToolName" type="number" value={settings.fontSizeToolName} onChange={handleSizeChange} placeholder="7" min="1" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 items-center">
                            <Label htmlFor="fontSizeDetails" className="col-span-2">Fuente Detalles (px)</Label>
                            <Input id="fontSizeDetails" name="fontSizeDetails" type="number" value={settings.fontSizeDetails} onChange={handleSizeChange} placeholder="5" min="1" />
                        </div>
                        <Separator />
                        <div className="space-y-2">
                           <h4 className="font-medium text-sm pt-2 flex items-center gap-2"><BadgeDollarSign className="h-5 w-5 text-muted-foreground"/> Ajustes de Precio</h4>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <Label htmlFor="fontSizePrice" className="col-span-2">Fuente Precio (px)</Label>
                                <Input id="fontSizePrice" name="fontSizePrice" type="number" value={settings.fontSizePrice} onChange={handleSizeChange} placeholder="10" min="1" />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="pricePositionX">Posición Horizontal (%)</Label>
                                <div className="flex items-center gap-2">
                                    <MoveHorizontal className="h-4 w-4 text-muted-foreground"/>
                                    <Slider id="pricePositionX" min={-100} max={100} step={1} value={[settings.pricePositionX]} onValueChange={handleSliderChange('pricePositionX')} />
                                    <span className="text-sm font-mono w-12 text-center">{settings.pricePositionX}%</span>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="pricePositionY">Posición Vertical (%)</Label>
                                <div className="flex items-center gap-2">
                                    <MoveVertical className="h-4 w-4 text-muted-foreground"/>
                                    <Slider id="pricePositionY" min={-50} max={50} step={1} value={[settings.pricePositionY]} onValueChange={handleSliderChange('pricePositionY')} />
                                    <span className="text-sm font-mono w-12 text-center">{settings.pricePositionY}%</span>
                                </div>
                            </div>
                        </div>
                        <Separator />
                         <div className="space-y-2">
                           <h4 className="font-medium text-sm pt-2 flex items-center gap-2"><ShieldHalf className="h-5 w-5 text-muted-foreground"/> Ajustes de Condición</h4>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <Label htmlFor="fontSizeCondition" className="col-span-2">Fuente Condición (px)</Label>
                                <Input id="fontSizeCondition" name="fontSizeCondition" type="number" value={settings.fontSizeCondition} onChange={handleSizeChange} placeholder="7" min="1" />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="conditionPositionX">Posición Horizontal (%)</Label>
                                <div className="flex items-center gap-2">
                                    <MoveHorizontal className="h-4 w-4 text-muted-foreground"/>
                                    <Slider id="conditionPositionX" min={-100} max={100} step={1} value={[settings.conditionPositionX]} onValueChange={handleSliderChange('conditionPositionX')} />
                                    <span className="text-sm font-mono w-12 text-center">{settings.conditionPositionX}%</span>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="conditionPositionY">Posición Vertical (%)</Label>
                                <div className="flex items-center gap-2">
                                    <MoveVertical className="h-4 w-4 text-muted-foreground"/>
                                    <Slider id="conditionPositionY" min={-50} max={50} step={1} value={[settings.conditionPositionY]} onValueChange={handleSliderChange('conditionPositionY')} />
                                    <span className="text-sm font-mono w-12 text-center">{settings.conditionPositionY}%</span>
                                </div>
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                           <Label htmlFor="qrCodeSize" className="flex items-center gap-2 pt-2"><ImageIcon className="h-4 w-4"/> Tamaño Código QR</Label>
                           <div className="flex items-center gap-2">
                                <Slider id="qrCodeSize" min={20} max={100} step={5} value={[settings.qrCodeSize]} onValueChange={handleSliderChange('qrCodeSize')} />
                                <span className="text-sm font-mono w-12 text-center">{settings.qrCodeSize}%</span>
                           </div>
                        </div>
                    </CardContent>
                </Card>
                
                 <div className="flex justify-end p-4">
                    <Button onClick={handleSave} size="lg">
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Plantilla de Etiqueta
                    </Button>
                </div>
            </div>
        </div>
    );
}
