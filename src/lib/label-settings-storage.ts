
'use client';

export const LABEL_SETTINGS_STORAGE_KEY = 'loma-tools-label-settings';

export const AVAILABLE_FIELDS = [
    { id: 'toolName', label: 'Nombre Herramienta' },
    { id: 'price', label: 'Precio' },
    { id: 'condition', label: 'Condición' },
    { id: 'catNo', label: 'CAT.NO.' },
    { id: 'serialNumber', label: 'Serial Number' },
    { id: 'qrCode', label: 'Código QR (con ID)' },
    { id: 'toolId', label: 'ID Herramienta (texto)' },
] as const;

export type LabelField = typeof AVAILABLE_FIELDS[number]['id'];
export type LabelUnit = 'mm' | 'cm' | 'in';
export type LabelStructure = 'horizontal' | 'vertical';
export type LabelQrPosition = 'start' | 'end';
export type LabelTextAlign = 'left' | 'center' | 'right';


export interface LabelSettings {
    width: number;
    height: number;
    unit: LabelUnit;
    fields: LabelField[];
    structure: LabelStructure;
    qrPosition: LabelQrPosition;
    textAlign: LabelTextAlign;
    fontSizeToolName: number;
    fontSizeDetails: number;
    fontSizePrice: number;
    pricePositionX: number; // Percentage offset
    pricePositionY: number; // Percentage offset
    fontSizeCondition: number;
    conditionPositionX: number; // Percentage offset
    conditionPositionY: number; // Percentage offset
    qrCodeSize: number; // Percentage of available space (e.g., 90 for 90%)
}

export const defaultLabelSettings: LabelSettings = {
    width: 90,
    height: 29,
    unit: 'mm',
    fields: ['toolName', 'price', 'condition', 'qrCode', 'catNo'],
    structure: 'horizontal',
    qrPosition: 'start',
    textAlign: 'left',
    fontSizeToolName: 7,
    fontSizeDetails: 5,
    fontSizePrice: 10,
    pricePositionX: 0,
    pricePositionY: 0,
    fontSizeCondition: 7,
    conditionPositionX: 40,
    conditionPositionY: 0,
    qrCodeSize: 90,
};

export function getLabelSettings(): LabelSettings {
    if (typeof window === 'undefined') {
        return defaultLabelSettings;
    }
    try {
        const savedSettings = localStorage.getItem(LABEL_SETTINGS_STORAGE_KEY);
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            
            return {
                ...defaultLabelSettings,
                ...parsed,
            };
        }
        return defaultLabelSettings;
    } catch (error) {
        console.error("Error reading label settings from localStorage:", error);
        return defaultLabelSettings;
    }
}

export function saveLabelSettings(settings: LabelSettings): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        localStorage.setItem(LABEL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error("Error saving label settings to localStorage:", error);
        return false;
    }
}
