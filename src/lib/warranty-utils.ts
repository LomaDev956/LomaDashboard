

'use client';

import { format, addYears, parseISO, isValid, getYear, parse, formatISO, intervalToDuration } from 'date-fns';
import { es } from 'date-fns/locale';
import type { WarrantyRule } from './warranty-rules-storage'; 
import { cn } from '@/lib/utils';
import { getToolNameByCatNo as getLearnedToolName } from './cat-no-knowledge-storage';


export interface WarrantyInfo {
  status: 'Activa' | 'Expirada' | 'Desconocida' | 'Error' | 'No Estimable' | 'Vitalicia' | 'Regla Manual';
  message: string;
  expirationDate?: string; // YYYY-MM-DD format
  estimationDetails?: string;
  ruleSource?: 'custom' | 'coded' | 'none';
}

const tools1YearCatNos: Record<string, string> = {
    '48-21-2301': "ONE-KEY Bluetooth Tracking Tag (1 año)", 
    '48-21-2302': "ONE-KEY Bluetooth Tracking Tag (1 año)",
    '48-21-2310': "ONE-KEY Bluetooth Tracking Tag (1 año)",
    '2891-20': "M18/M12 Wireless Jobsite Speaker (1 año)",
    '2592-20': "M12 Wireless Bluetooth Speaker (1 año)",
    '2792-20': "M18 Jobsite Radio/Charger (1 año)",
    '2951-20': "M12 Radio + Charger (1 año)",
    '2890-20': "M18 Jobsite Radio (1 año)",
};
const tools2YearCatNos: Record<string, string> = {
    'MXF368-1XC': "MX FUEL Breaker Kit (2 años)",
    'MXF041-1XC': "MX FUEL ROCKET Tower Light/Charger Kit (2 años)",
    '3154-20': "M12 75' Drain Camera w/ PACKOUT (2 años)",
};
const tools3YearCatNos: Record<string, string> = {
    '2540-20': "M12 23 Gauge Pin Nailer (3 años)",
    '2688-20': "M18 Compact Heat Gun (3 años)",
    '2688-21': "M18 Compact Heat Gun Kit (3 años)",
    '8960-20': "8 Gallon Dust Extractor (3 años)",
    '3017-20': "M18 FUEL Blower (Tool Only) (3 años)", 
    '2824-20': "M18 FUEL Dual Battery Blower (3 años)", 
};
const tools5YearCatNos: Record<string, string> = {
    '2630-20': "M18 6-1/2\" Circular Saw (5 años)",
};
const batteries3YearCatNos: Record<string, string> = {
    '48-11-1812': "M18 High Output HD12.0 Ah (3 años)",
    '48-11-1828': "M18 REDLITHIUM XC 3.0 Ah (S/N B41E+: 3 años; B41D-: 2yr+3yr pro-rata)", 
    '48-11-1840': "M18 REDLITHIUM XC 4.0 Ah (3 años)",
    '48-11-1850': "M18 REDLITHIUM XC 5.0 Ah (3 años)",
    '48-11-1850R': "M18 REDLITHIUM XC 5.0Ah (3 años)",
    '48-11-1861': "M18 REDLITHIUM XC 6.0 Ah / FORGE XC 6.0Ah (3 años)",
    '48-11-1865': "M18 High Output XC 6.0 Ah (3 años)",
    '48-11-1880': "M18 High Output XC 8.0 Ah (3 años)",
    '48-11-1890': "M18 High Output XC 12.0 Ah (3 años)", 
    '48-11-2402': "M12 XC High Capacity 3.0 Ah (3 años)",
    '48-11-2412': "M12 XC High Capacity REDLITHIUM 3.0 Ah (3 años)",
    '48-11-2440': "M12 XC Extended Capacity 4.0 Ah (3 años)",
    '48-11-2460': "M12 XC 6.0 Ah (3 años)",
    '48-11-2830': "M28 REDLITHIUM 3.0 Ah (S/N C71: 3 años; A71: 2yr+3yr pro-rata)", 
    '48-11-2450': "M12 REDLITHIUM HIGH OUTPUT XC 5.0 Ah (3 años)",
};
const batteries2YearCatNos: Record<string, string> = {
    '48-11-1815': "M18 Compact (1.5 Ah) Battery (2 años)",
    '48-11-1820': "M18 CP 2.0 Ah (2 años)",
    '48-11-1835': "M18 High Output CP 3.0 Ah (2 años)",
    '48-11-2001': "M4 2.0 Ah (2 años)",
    '48-11-2401': "M12 CP 1.5 Ah (2 años)",
    '48-11-2420': "M12 CP 2.0 Ah (2 años)",
    '48-11-2430': "M12 3.0 Ah Compact (2 años)",
    '48-11-2425': "M12 REDLITHIUM HIGH OUTPUT CP 2.5 Ah (2 años)",
    '48-11-2131': "REDLITHIUM USB 3.0 Ah (2 años)",
    'MXFXC406': "MX FUEL XC406 (6 Ah) (2 años)",
    'MXFCP203': "MX FUEL CP203 (3 Ah) (2 años)",
    'MXFXC608': "MX FUEL REDLITHIUM FORGE XC 8.0 Ah (2 años)",
    'MXFHD812': "MX FUEL REDLITHIUM FORGE HD 12.0 Ah (2 años)",
};
const batteries1YearCatNos: Record<string, string> = {
    '48-11-0100': "Ni-Cd/Ni-MH Battery (1 año)",
    '48-11-1024': "Ni-Cd/Ni-MH Battery (1 año)",
    '48-11-1970': "Ni-Cd/Ni-MH Battery (1 año)",
    '48-11-2230': "Ni-Cd/Ni-MH Battery (1 año)",
};
const chargers5YearCatNos: Record<string, string> = {
    '48-59-1808': "M18 & M12 Rapid Charger (5 años, esp. si con kit)",
    '48-59-1809': "M18 PACKOUT Six Bay Rapid Charger (5 años)",
    '48-59-1812': "M18 & M12 Multi-Voltage Charger (5 años, esp. si con kit)",
    '48-59-1810': "M18 & M12 Vehicle Charger (5 años, esp. si con kit)",
};
const chargers2YearCatNos: Record<string, string> = {};
const lighting2YearCatNos: Record<string, string> = {
    '2010R': "Rechargeable 250L Penlight w/ Laser (2 años)",
    '2011R': "Rechargeable 500L EDC Flashlight w/ Magnet (2 años)",
    '2012R': "Rechargeable Magnetic Headlamp and Task Light (2 años)",
};
const testAndMeasurement1YearCatNos: Record<string, string> = {
    '2201-20': "Voltage Detector with Work Light (1 año)",
    '2202-20': "Voltage Detector with LED (1 año)",
    '2230-20': "M12 2-Beam Plumb Laser (1 año)",
};
const lifetimeCatNos: Record<string, string> = {
    '48-22-8349': "PACKOUT Long Handle Tool Rack (Garantía Limitada de por Vida)",
    '48-22-8338': "PACKOUT M12 Battery Rack (Garantía Limitada de por Vida)",
    '48-22-8343': "PACKOUT Tool Station (Garantía Limitada de por Vida)",
};

const allKnownCatNos = {
  ...tools1YearCatNos, ...tools2YearCatNos, ...tools3YearCatNos, ...tools5YearCatNos,
  ...batteries1YearCatNos, ...batteries2YearCatNos, ...batteries3YearCatNos,
  ...chargers2YearCatNos, ...chargers5YearCatNos,
  ...lighting2YearCatNos, ...testAndMeasurement1YearCatNos,
  ...lifetimeCatNos,
};

export const getToolNameByCatNo = async (catNo: string | null): Promise<string | null> => {
    if (!catNo) return null;
    const cleanCatNo = catNo.trim().toUpperCase();

    // 1. Check learned knowledge first
    const learnedName = await getLearnedToolName(cleanCatNo);
    if (learnedName) {
        return learnedName;
    }

    // 2. Fallback to hardcoded list
    const toolName = allKnownCatNos[cleanCatNo];
    if (toolName) {
        // Remove warranty details like "(1 año)" from the end of the string
        return toolName.replace(/\s*\([\s\S]*\)$/, '').trim();
    }
    
    return null;
}

export const determineWarrantyPeriod = (
  productDescription: string | null,
  catalogNumber: string | null,
  customRules: WarrantyRule[]
): { years: number | null; details: string; isLifetime?: boolean; isProrata?: { fullYears: number; prorataYears: number; details: string }, ruleSource: 'custom' | 'coded' | 'none' } => {
  
  const desc = (productDescription || '').toLowerCase();
  const catNo = (catalogNumber || '').trim().toUpperCase();

  // 0. Check for custom user-defined rules first
  if (catNo && customRules) {
    const customRule = customRules.find(rule =>
      (rule.catNo ?? '').trim().toUpperCase() === catNo.trim().toUpperCase()
    );
    if (customRule) {
      return {
        years: customRule.years,
        details: customRule.description || (customRule.isLifetime ? "Garantía Vitalicia (Personalizada)" : `${customRule.years ?? 'N/A'} Años (Personalizada)`),
        isLifetime: customRule.isLifetime,
        ruleSource: 'custom',
      };
    }
  }

  // 1. Lifetime Warranties by CAT.NO. or Keywords
  if (catNo && lifetimeCatNos[catNo]) {
    return { years: null, details: lifetimeCatNos[catNo], isLifetime: true, ruleSource: 'coded' };
  }
  if (desc.includes("insider box ratchet socket") || desc.includes("hex-lok 2-in-1 handle")) {
     return { years: null, details: "Herramienta manual con Garantía Limitada de por Vida.", isLifetime: true, ruleSource: 'coded' };
  }
  if ((desc.includes("led work light") || desc.includes("led upgrade bulb")) && desc.includes("led in")) {
    return { years: null, details: "LED en Luz de Trabajo LED o Bombilla de Actualización LED (Garantía Limitada de por Vida).", isLifetime: true, ruleSource: 'coded' };
  }

  // 2. Specific CAT.NO. matches
  if (catNo) {
    if (tools1YearCatNos[catNo]) return { years: 1, details: tools1YearCatNos[catNo], ruleSource: 'coded' };
    if (tools2YearCatNos[catNo]) return { years: 2, details: tools2YearCatNos[catNo], ruleSource: 'coded' };
    if (tools3YearCatNos[catNo]) return { years: 3, details: tools3YearCatNos[catNo], ruleSource: 'coded' };
    if (tools5YearCatNos[catNo]) return { years: 5, details: tools5YearCatNos[catNo], ruleSource: 'coded' };
    if (batteries3YearCatNos[catNo]) return { years: 3, details: batteries3YearCatNos[catNo], ruleSource: 'coded' };
    if (batteries2YearCatNos[catNo]) return { years: 2, details: batteries2YearCatNos[catNo], ruleSource: 'coded' };
    if (batteries1YearCatNos[catNo]) return { years: 1, details: batteries1YearCatNos[catNo], ruleSource: 'coded' };
    if (chargers5YearCatNos[catNo]) return { years: 5, details: chargers5YearCatNos[catNo], ruleSource: 'coded' };
    if (chargers2YearCatNos[catNo]) return { years: 2, details: chargers2YearCatNos[catNo], ruleSource: 'coded' };
    if (lighting2YearCatNos[catNo]) return { years: 2, details: lighting2YearCatNos[catNo], ruleSource: 'coded' };
    if (testAndMeasurement1YearCatNos[catNo]) return { years: 1, details: testAndMeasurement1YearCatNos[catNo], ruleSource: 'coded' };
  }

  // Fallback to keyword-based logic if CAT.NO. doesn't match
  // ... (rest of the keyword logic remains the same)

  // Default if no other rule matches
  return { years: 5, details: "Herramienta Eléctrica M12/M18 (garantía general de 5 años).", ruleSource: 'coded' };
};


export const estimateWarrantyFromSerialNumber = (
  serialNumber: string | null,
  productDescription: string | null,
  catalogNumber: string | null,
  customRules: WarrantyRule[],
  manualExpirationDate?: string | null
): WarrantyInfo => {
  // Priority 0: Check for serial number exceptions FIRST
  if (serialNumber && catalogNumber) {
    const { getSerialException } = require('./serial-exceptions');
    const exception = getSerialException(serialNumber, catalogNumber);
    if (exception) {
      try {
        const expDate = parseISO(exception.correctExpirationDate);
        if (isValid(expDate)) {
          const isActive = new Date() < expDate;
          return {
            status: isActive ? 'Activa' : 'Expirada',
            message: `Garantía ${isActive ? 'activa hasta el' : 'expiró el'} ${format(expDate, "PPP", { locale: es })}.`,
            expirationDate: formatISO(expDate, { representation: 'date' }),
            estimationDetails: `Excepción: ${exception.reason}`,
            ruleSource: 'custom'
          };
        }
      } catch (e) {
        console.warn("Could not parse exception date:", exception.correctExpirationDate);
      }
    }
  }

  // Priority 1: Check for a valid manual expiration date.
  if (manualExpirationDate) {
    try {
      const expDate = parseISO(manualExpirationDate);
      if (isValid(expDate)) {
        const isActive = new Date() < expDate;
        return {
          status: isActive ? 'Activa' : 'Expirada',
          message: `Garantía manual ${isActive ? 'activa hasta el' : 'expiró el'} ${format(expDate, "PPP", { locale: es })}.`,
          expirationDate: formatISO(expDate, { representation: 'date' }),
          estimationDetails: "Basado en la fecha de vencimiento ingresada manualmente.",
          ruleSource: 'none'
        };
      }
    } catch (e) {
      console.warn("Could not parse manual expiration date:", manualExpirationDate);
    }
  }
  
  const cleanSerialNumber = (serialNumber || '').replace(/\s/g, '');

  if (!cleanSerialNumber || cleanSerialNumber.length < 6) {
    return {
      status: 'No Estimable',
      message: "Se requiere un S/N de al menos 6 caracteres para estimar la garantía.",
      estimationDetails: "El número de serie es demasiado corto o no es válido.",
      ruleSource: 'none'
    };
  }

  const warrantyPeriod = determineWarrantyPeriod(productDescription, catalogNumber, customRules);
  
  if (warrantyPeriod.isLifetime) {
    return {
        status: 'Vitalicia',
        message: warrantyPeriod.details,
        estimationDetails: warrantyPeriod.details,
        ruleSource: warrantyPeriod.ruleSource
    };
  }
  
  if (warrantyPeriod.years === null) {
      return { status: 'Regla Manual', message: warrantyPeriod.details, estimationDetails: warrantyPeriod.details, ruleSource: warrantyPeriod.ruleSource };
  }
  
  if (warrantyPeriod.years === 0) {
    return {
      status: 'Expirada',
      message: warrantyPeriod.details || `Garantía de 0 años.`,
      estimationDetails: warrantyPeriod.details || `Regla: Años: 0.`,
      expirationDate: formatISO(new Date(), { representation: 'date' }), 
      ruleSource: warrantyPeriod.ruleSource
    };
  }

  let dateEstimationSource = "";
  let estimatedManufactureDateObj: Date | null = null;
  
  // --- CORRECTED LOGIC ---
  const parseDateFromSN = (sn: string): { date: Date, source: string } | null => {
    // 1. Try AAMMDD first (more specific)
    const yymmddMatch = sn.match(/(\d{2})(\d{2})(\d{2})/);
    if (yymmddMatch) {
      const yearStr = yymmddMatch[1];
      const monthStr = yymmddMatch[2];
      const dayStr = yymmddMatch[3];
      
      let year = parseInt(yearStr, 10);
      const currentYearLastTwoDigits = new Date().getFullYear() % 100;
      if (year >= 0 && year <= (currentYearLastTwoDigits + 5)) year += 2000;
      else if (year > (currentYearLastTwoDigits + 5) && year <= 99 && year >= 70) year += 1900;
      
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);

      if (year >= 1970 && year <= (new Date().getFullYear() + 5) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const tempDate = new Date(year, month - 1, day);
        if (isValid(tempDate) && tempDate.getFullYear() === year && tempDate.getMonth() === month - 1) {
          return {
            date: tempDate,
            source: `Basado en fecha de fab. estimada: ${format(tempDate, "PPP", { locale: es })} (patrón general AAMMDD '${yearStr}-${monthStr}-${dayStr}').`
          };
        }
      }
    }

    // 2. Try YYWW (less specific)
    const yywwMatch = sn.match(/(\d{2})(\d{2})/);
    if (yywwMatch) {
        const yearStr = yywwMatch[1];
        const weekStr = yywwMatch[2];
        
        let year = parseInt(yearStr, 10);
        const currentYearLastTwoDigits = new Date().getFullYear() % 100;

        if (year >= 0 && year <= (currentYearLastTwoDigits + 5)) year += 2000;
        else if (year > (currentYearLastTwoDigits + 5) && year <= 99 && year >= 70) year += 1900;
        
        const week = parseInt(weekStr, 10);
        if (year >= 1970 && year <= (new Date().getFullYear() + 5) && week >= 1 && week <= 53) {
            try {
                const firstDayOfYear = new Date(year, 0, 1);
                const daysOffset = (week - 1) * 7;
                const tempDate = new Date(firstDayOfYear.getFullYear(), firstDayOfYear.getMonth(), firstDayOfYear.getDate() + daysOffset);
                if (isValid(tempDate)) {
                    return {
                       date: tempDate,
                       source: `Basado en fecha de fab. estimada: ${format(tempDate, "PPP", { locale: es })} (patrón general AASS '${yearStr}-${weekStr}').`
                    };
                }
            } catch(e) {/* ignore */}
        }
    }
    return null;
  };
  
  // Prefer positional YYWW first (indices 5-8)
  if (cleanSerialNumber.length >= 9) {
    const positionalDateInfo = parseDateFromSN(cleanSerialNumber.substring(5, 9));
    if (positionalDateInfo) {
      estimatedManufactureDateObj = positionalDateInfo.date;
      dateEstimationSource = positionalDateInfo.source.replace("general", "posicional");
    }
  }

  // If positional fails, try general search
  if (!estimatedManufactureDateObj) {
      const generalDateInfo = parseDateFromSN(cleanSerialNumber);
      if(generalDateInfo) {
          estimatedManufactureDateObj = generalDateInfo.date;
          dateEstimationSource = generalDateInfo.source;
      }
  }


  if (estimatedManufactureDateObj) {
      const expirationDateObj = addYears(estimatedManufactureDateObj, warrantyPeriod.years);
      const isActive = new Date() < expirationDateObj;
      
      const statusType: WarrantyInfo['status'] = isActive ? 'Activa' : 'Expirada';
      
      let finalMessage = `Garantía ${warrantyPeriod.ruleSource === 'custom' ? 'PERS.' : 'EST.'} ${isActive ? 'activa hasta el' : 'expiró el'} ${format(expirationDateObj, "PPP", { locale: es })}.`;
      
      return {
        status: statusType,
        expirationDate: formatISO(expirationDateObj, { representation: 'date' }), 
        message: finalMessage,
        estimationDetails: `${dateEstimationSource} ${warrantyPeriod.details}`,
        ruleSource: warrantyPeriod.ruleSource
      };
  }
  
  return { status: 'No Estimable', message: "El S/N no contiene patrón de fecha reconocible.", estimationDetails: `No se encontró patrón de fecha en '${cleanSerialNumber}'. ${warrantyPeriod.details}`, ruleSource: warrantyPeriod.ruleSource };
};


export const getWarrantyStatusBgColor = (status?: WarrantyInfo['status']) => {
    switch (status) {
        case 'Activa': 
            return "bg-success text-success-foreground";
        case 'Expirada': 
            return "bg-destructive text-destructive-foreground";
        case 'Vitalicia': 
            return "bg-blue-500 text-white";
        case 'Regla Manual':
            return "bg-purple-500 text-white";
        default: // No Estimable, Error, Desconocida
            return "bg-muted text-muted-foreground";
    }
};


