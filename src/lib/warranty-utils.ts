
'use client';

import { format, addYears, parseISO, isValid, getYear, parse, formatISO, formatDistanceStrict } from 'date-fns';
import type { WarrantyRule } from './warranty-rules-storage'; 
import { cn } from '@/lib/utils';
import { getToolNameForCatNo as getLearnedToolName } from './cat-no-knowledge-storage';


export interface WarrantyInfo {
  status: 'Activa' | 'Expirada' | 'Desconocida' | 'Error' | 'No Estimable' | 'Vitalicia' | 'Personalizada';
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
    '2688-20': "M18 Compact Heat Gun (3 años)",
    '2688-21': "M18 Compact Heat Gun Kit (3 años)",
    '8960-20': "8 Gallon Dust Extractor (3 años)",
    '3017-20': "M18 FUEL Blower (Tool Only) (3 años)", 
    '2824-20': "M18 FUEL Dual Battery Blower (3 años)", 
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
  ...tools1YearCatNos, ...tools2YearCatNos, ...tools3YearCatNos,
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
  customRules: WarrantyRule[] // Accept customRules as a parameter
): { years: number | null; details: string; isLifetime?: boolean; isProrata?: { fullYears: number; prorataYears: number; details: string }, ruleSource: 'custom' | 'coded' } => {
  
  const desc = (productDescription || '').toLowerCase();
  const catNo = (catalogNumber || '').trim().toUpperCase();

  // 0. Check for custom user-defined rules first
  if (catNo && customRules) { // Check if customRules is provided
    const customRule = customRules.find(
      rule => (rule.catNo ?? '').trim().toLowerCase() === catNo.trim().toLowerCase()
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

  // Specific CAT.NO. based warranties - Tools
  
  const prorataBatteries: Record<string, { fullYears: number; prorataYears: number; details: string }> = {
    '48-11-1828_PRORATA': { fullYears: 2, prorataYears: 3, details: "Batería M18 XC 3.0Ah (S/N B41D o anterior): 2 años completos + 3 años pro-rata." }, 
    '48-11-1830_PRORATA': { fullYears: 2, prorataYears: 3, details: "Batería V18 (S/N A95): 2 años completos + 3 años pro-rata." }, 
    '48-11-2830_PRORATA': { fullYears: 2, prorataYears: 3, details: "Batería V28 (S/N A71): 2 años completos + 3 años pro-rata." }, 
  };

  

  // --- Order of Precedence ---
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

    if (batteries3YearCatNos[catNo]) {
        if (catNo === '48-11-1828') {
            return { years: 3, details: "Batería M18 XC 3.0Ah (3 años para S/N B41E y posteriores; 2 años + 3 pro-rata para S/N B41D y anteriores. Verifique S/N).", ruleSource: 'coded' };
        }
        if (catNo === '48-11-2830') { 
            return { years: 3, details: "Batería M28 REDLITHIUM 3.0 Ah (3 años para S/N C71; 2 años + 3 pro-rata para S/N A71. Verifique S/N).", ruleSource: 'coded' };
        }
        return { years: 3, details: batteries3YearCatNos[catNo], ruleSource: 'coded' };
    }
    if (batteries2YearCatNos[catNo]) return { years: 2, details: batteries2YearCatNos[catNo], ruleSource: 'coded' };
    if (batteries1YearCatNos[catNo]) {
        if (catNo === '48-11-1830' && (desc.includes('v18') || desc.includes('lithium'))) {
            const prorata = prorataBatteries['48-11-1830_PRORATA'];
            return { years: prorata.fullYears, details: prorata.details, isProrata: prorata, ruleSource: 'coded' };
        }
        return { years: 1, details: batteries1YearCatNos[catNo], ruleSource: 'coded' };
    }

    if (chargers5YearCatNos[catNo]) return { years: 5, details: chargers5YearCatNos[catNo], ruleSource: 'coded' };
    if (chargers2YearCatNos[catNo]) return { years: 2, details: chargers2YearCatNos[catNo], ruleSource: 'coded' };
    
    if (lighting2YearCatNos[catNo]) return { years: 2, details: lighting2YearCatNos[catNo], ruleSource: 'coded' };
    if (testAndMeasurement1YearCatNos[catNo]) return { years: 1, details: testAndMeasurement1YearCatNos[catNo], ruleSource: 'coded' };
  }

  // 3. MX FUEL Products General Rule
  if (desc.includes("mx fuel") || (catNo && catNo.startsWith("MXF"))) {
    if (desc.includes("battery") || desc.includes("batería") || (catNo && (catNo.startsWith("MXFB") || catNo.startsWith("MXFXC") || catNo.startsWith("MXFCP")))) {
      return { years: 2, details: "Batería MX FUEL (garantía general de 2 años).", ruleSource: 'coded' };
    }
    if (desc.includes("charger") || desc.includes("cargador")) {
      return { years: 2, details: "Cargador MX FUEL (garantía general de 2 años).", ruleSource: 'coded' };
    }
    return { years: 2, details: "Equipo MX FUEL (garantía general de 2 años).", ruleSource: 'coded' };
  }

  // 4. Keyword-based for 1-Year Tools
  const oneYearToolKeywords = ["job site radio", "jobsite radio", "m12 power port", "m18 power source", "jobsite fan", "trade titan", "tool & equipment tracker", "hoist", "jobsite speaker", "bluetooth speaker"];
  if (oneYearToolKeywords.some(keyword => desc.includes(keyword))) {
    if (!(desc.includes("jobsite fan") && Object.keys(lighting2YearCatNos).some(lk => catNo && catNo.startsWith(lk.substring(0,4))))) { 
        return { years: 1, details: `Herramienta específica (ej. ${oneYearToolKeywords.find(k => desc.includes(k))}) (1 año).`, ruleSource: 'coded' };
    }
  }
  if (desc.includes("reconditioned") || desc.includes("reacondicionado")) {
    return { years: 1, details: "Producto Reacondicionado (1 año).", ruleSource: 'coded' };
  }

  // 5. Keyword-based for 2-Year Tools
  const twoYearToolKeywords = ["drain cleaning cable", "airsnake", "force logic press tool", "m18 fuel 1\" d-handle", "redlithium usb laser level"];
  if (twoYearToolKeywords.some(keyword => desc.includes(keyword))) {
    return { years: 2, details: `Herramienta específica (ej. ${twoYearToolKeywords.find(k => desc.includes(k))}) (2 años).`, ruleSource: 'coded' };
  }
  
  // 6. Keyword-based for 3-Year Tools
  const threeYearToolKeywords = [
      "compact heat gun", "dust extractor", "framing nailer", "pin nailer", "nailer", "cable stapler",
      "blind rivet tool", "tire buffer", "random orbital polisher", 
      "utility fencing stapler", "digital level", "laser level", "m18 fuel blower"
  ];
  if (threeYearToolKeywords.some(keyword => desc.includes(keyword))) {
     if (desc.includes("laser level") && desc.includes("redlithium usb laser level")) {
        // Already handled by twoYearToolKeywords
     } else if (desc.includes("laser level") && !desc.includes("redlithium usb laser level")) { 
        return { years: 3, details: `Herramienta específica (ej. ${threeYearToolKeywords.find(k => desc.includes(k) && k === "laser level")}) (3 años).`, ruleSource: 'coded' };
     } else if (!desc.includes("laser level")) { 
        return { years: 3, details: `Herramienta específica (ej. ${threeYearToolKeywords.find(k => desc.includes(k))}) (3 años).`, ruleSource: 'coded' };
     }
  }
  
  // 7. Chargers
  if (desc.includes("charger") || desc.includes("cargador")) {
    if (desc.includes("redlithium usb charger") || (catNo && catNo.includes("2131"))) {
        return { years: 2, details: "REDLITHIUM USB Charger (2 años).", ruleSource: 'coded' };
    }
    if (catNo && (tools1YearCatNos[catNo] || oneYearToolKeywords.some(k => desc.includes(k) && (k.includes("radio") || k.includes("speaker")) ))) {
        // Already handled
    } else {
        return { years: 5, details: "Cargador M12/M18 (garantía general de 5 años, esp. si con kit).", ruleSource: 'coded' };
    }
  }

  // 8. Batteries
  if (desc.includes("battery") || desc.includes("batería") || (catNo && catNo.startsWith("48-11-"))) {
    if (catNo && (catNo.includes("0100") || catNo.includes("1024") || catNo.includes("1970") || catNo.includes("2230") || (catNo.includes("1830") && desc.includes("nicd")))) {
      return { years: 1, details: "Batería Ni-Cd/Ni-MH (1 año).", ruleSource: 'coded' };
    }
    if (desc.includes("redlithium usb") || (catNo && catNo.includes("2131"))) {
      return { years: 2, details: "Batería REDLITHIUM USB (2 años).", ruleSource: 'coded' };
    }

    let ahValue = 0;
    const ahMatch = desc.match(/(\d+(\.\d+)?)\s*ah/);
    if (ahMatch && ahMatch[1]) {
      ahValue = parseFloat(ahMatch[1]);
    } else if (catNo) { 
        if (catNo.includes('1812') || catNo.includes('1890') || catNo.includes('MXFHD812')) ahValue = 12.0;
        else if (catNo.includes('1880') || catNo.includes('MXFXC608')) ahValue = 8.0;
        else if (catNo.includes('1865') || catNo.includes('1861') || catNo.includes('2460') || catNo.includes('MXFXC406')) ahValue = 6.0;
        else if (catNo.includes('1850') || catNo.includes('1852') || catNo.includes('2450')) ahValue = 5.0;
        else if (catNo.includes('1840') || catNo.includes('2440')) ahValue = 4.0;
        else if (catNo.includes('1835') || catNo.includes('1828') || catNo.includes('2402') || catNo.includes('2412') || catNo.includes('2430') || catNo.includes('MXFCP203') || catNo.includes('2830')) ahValue = 3.0;
        else if (catNo.includes('2425')) ahValue = 2.5;
        else if (catNo.includes('1815') || catNo.includes('1820') || catNo.includes('2420') || catNo.includes('2001') || catNo.includes('2401')) ahValue = 2.0;
    }

    if (ahValue > 0) {
      if (ahValue < 3.0) {
        return { years: 2, details: `Batería Li-Ion (<3.0Ah, detectada ${ahValue}Ah) (2 años).`, ruleSource: 'coded' };
      } else { 
        return { years: 3, details: `Batería Li-Ion (>=3.0Ah, detectada ${ahValue}Ah) (3 años).`, ruleSource: 'coded' };
      }
    }
    if (desc.includes("lithium") || desc.includes("redlithium") || desc.includes("m12") || desc.includes("m18") || desc.includes("m28") || desc.includes("v18") || desc.includes("v28")){
        return { years: 2, details: "Batería Li-Ion (capacidad no determinada claramente, asumiendo <3.0Ah para 2 años).", ruleSource: 'coded' };
    }
  }
  
  // 9. Test & Measurement Products
  if (desc.includes("test & measurement") || desc.includes("medición") || desc.includes("detector") || desc.includes("multimeter") || desc.includes("clamp meter") || desc.includes("thermometer")) {
    if (!(catNo && testAndMeasurement1YearCatNos[catNo])) { 
      if (desc.includes("laser level") && desc.includes("redlithium usb")) {
          // Already handled
      } else {
        return { years: 5, details: "Producto de Test & Measurement (garantía general de 5 años).", ruleSource: 'coded' };
      }
    }
  }
  
  // 10. M12/M18 Power Tools General Rule (Default for M12/M18 unless specified otherwise)
  if (desc.includes("m12") || desc.includes("m18") || (catNo && (catNo.startsWith("0") || catNo.startsWith("2")))) {
    const isException = desc.includes("battery") || desc.includes("batería") ||
                        desc.includes("charger") || desc.includes("cargador") ||
                        oneYearToolKeywords.some(keyword => desc.includes(keyword)) || 
                        twoYearToolKeywords.some(keyword => desc.includes(keyword)) || 
                        threeYearToolKeywords.some(keyword => desc.includes(keyword)) || 
                        (catNo && (tools1YearCatNos[catNo] || tools2YearCatNos[catNo] || tools3YearCatNos[catNo]));
    if (!isException) {
      return { years: 5, details: "Herramienta Eléctrica M12/M18 (garantía general de 5 años).", ruleSource: 'coded' };
    }
  }

  return { years: 3, details: "Garantía por defecto estimada de 3 años (tipo de producto no identificado claramente para reglas específicas).", ruleSource: 'coded' };
};


export const estimateWarrantyFromSerialNumber = (
  serialNumber: string | null,
  productDescription: string | null,
  catalogNumber: string | null,
  customRules: WarrantyRule[] // Accept customRules as a parameter
): WarrantyInfo => {
  if (!serialNumber || typeof serialNumber !== 'string' || serialNumber.trim().length === 0) {
    return {
      status: 'No Estimable',
      message: "Número de serie no proporcionado o inválido.",
      estimationDetails: "El campo del número de serie está vacío o no es válido.",
      ruleSource: 'none'
    };
  }

  const warrantyPeriod = determineWarrantyPeriod(productDescription, catalogNumber, customRules);
  
  if (warrantyPeriod.isLifetime) {
    return {
        status: warrantyPeriod.ruleSource === 'custom' ? 'Personalizada' : 'Vitalicia',
        message: warrantyPeriod.details,
        estimationDetails: warrantyPeriod.details,
        ruleSource: warrantyPeriod.ruleSource
    };
  }

  const yearsOfWarranty = warrantyPeriod.years;

  if (yearsOfWarranty === null || yearsOfWarranty < 0) {
    return {
        status: warrantyPeriod.ruleSource === 'custom' ? 'Personalizada' : 'No Estimable',
        message: warrantyPeriod.ruleSource === 'custom' ? warrantyPeriod.details : "No se pudo determinar un período de garantía en años para calcular la expiración.",
        estimationDetails: warrantyPeriod.details || "Período de garantía no numérico o no especificado.",
        ruleSource: warrantyPeriod.ruleSource
    };
  }
  
  if (yearsOfWarranty === 0 && warrantyPeriod.ruleSource === 'custom') {
    return {
      status: 'Personalizada',
      message: warrantyPeriod.details || `Garantía de 0 años (Personalizada).`,
      estimationDetails: warrantyPeriod.details || `Regla personalizada: Años: 0.`,
      expirationDate: formatISO(new Date(), { representation: 'date' }), 
      ruleSource: 'custom'
    };
  }

  let dateEstimationSource = "";
  let estimatedManufactureDateObj: Date | null = null;

  
  const sixDigitMatch = serialNumber.match(/(\d{2})(\d{2})(\d{2})/);
  if (sixDigitMatch) {
    const yearStr = sixDigitMatch[1];
    const monthStr = sixDigitMatch[2];
    const dayStr = sixDigitMatch[3];
    
    let year = parseInt(yearStr, 10);
    const currentYearLastTwoDigits = new Date().getFullYear() % 100;
    
    if (year >= 0 && year <= (currentYearLastTwoDigits + 5)) { 
        year += 2000;
    } else if (year > (currentYearLastTwoDigits + 5) && year <= 99 && year >= 70 ) { 
         year += 1900;
    }
    
    if (year >= 1970 && year <= (new Date().getFullYear() + 5)) { 
        const tempDate = parse(`${year}-${monthStr}-${dayStr}`, 'yyyy-MM-dd', new Date());
        if (isValid(tempDate) && getYear(tempDate) === year && 
            parseInt(monthStr,10) >=1 && parseInt(monthStr,10) <=12 && 
            parseInt(dayStr,10) >=1 && parseInt(dayStr,10) <=31) {
            
            estimatedManufactureDateObj = tempDate;
            dateEstimationSource = `Basado en fecha de fab. estimada: ${format(tempDate, "dd/MM/yyyy")} (patrón YYMMDD ${sixDigitMatch[0].substring(0,6)}).`;
        }
    }
  }

  
  if (!estimatedManufactureDateObj) {
    const yywwPatterns = [
      { regex: /[A-Z0-9]+?([0-9]{2})([0-9]{2})(?=[0-9A-Z]{6,})/, label: "Prefijo + YYWW + SufijoNumAlfa" },
      { regex: /[A-Z0-9]+?([0-9]{2})([0-9]{2})(?=[0-9]{6,})/, label: "Prefijo + YYWW + SufijoNum" }, 
      { regex: /[A-Z0-9]+?([0-9]{2})([0-9]{2})[A-Z0-9]*$/, label: "Prefijo + YYWW + SufijoAlfaNum" }, 
      { regex: /\b([0-9]{2})([0-9]{2})\b(?!\d)/, label: "YYWW Aislado" }      
    ];

    for (const pattern of yywwPatterns) {
      const match = serialNumber.match(pattern.regex);
      if (match) {
        const yearStr = match[1];
        const weekStr = match[2];
        const matchedPartForLog = pattern.label.includes("Prefijo") ? (match[0]) : (yearStr + weekStr);


        let year = parseInt(yearStr, 10);
        const currentYearLastTwoDigits = new Date().getFullYear() % 100;

        if (year >= 0 && year <= (currentYearLastTwoDigits + 5)) {
            year += 2000;
        } else if (year > (currentYearLastTwoDigits + 5) && year <= 99 && year >= 70) { 
            year += 1900;
        } else {
            continue; 
        }

        const week = parseInt(weekStr, 10);
        if (Number.isNaN(week)) continue;

        if (year >= 1970 && year <= (new Date().getFullYear() + 5) && week >= 1 && week <= 53) {
            try {
                const firstDayOfYear = new Date(year, 0, 1); 
                const daysOffset = (week - 1) * 7; 
                const tempDate = new Date(firstDayOfYear.getFullYear(), firstDayOfYear.getMonth(), firstDayOfYear.getDate() + daysOffset);

                if (isValid(tempDate) && (getYear(tempDate) === year || getYear(tempDate) === year -1 || getYear(tempDate) === year +1)) { 
                    estimatedManufactureDateObj = tempDate;
                    dateEstimationSource = `Basado en fecha de fab. estimada: ${format(tempDate, "dd/MM/yyyy")} (patrón ${pattern.label} '${matchedPartForLog.replace(yearStr+weekStr, yearStr+"-"+weekStr)}').`;
                    break; 
                }
            } catch (e) { /* ignore date parsing error here, try next pattern */ }
        }
      }
      if (estimatedManufactureDateObj) break; 
    }
  }


  if (estimatedManufactureDateObj) {
      const expirationDateObj = addYears(estimatedManufactureDateObj, yearsOfWarranty);
      const isActive = new Date() < expirationDateObj;
      
      const statusType: WarrantyInfo['status'] = warrantyPeriod.ruleSource === 'custom' ? 'Personalizada' : (isActive ? 'Activa' : 'Expirada');
      
      let finalMessage = `Garantía ${warrantyPeriod.ruleSource === 'custom' ? 'PERS. ' : 'EST.'} ${isActive ? 'activa hasta el' : 'expiró el'} ${format(expirationDateObj, "dd/MM/yyyy")}.`;
      if (warrantyPeriod.isProrata) {
        finalMessage += ` (${warrantyPeriod.isProrata.fullYears} años completos + ${warrantyPeriod.isProrata.prorataYears} años pro-rata).`;
      }
      return {
        status: statusType,
        expirationDate: formatISO(expirationDateObj, { representation: 'date' }), 
        message: finalMessage,
        estimationDetails: `${dateEstimationSource} ${warrantyPeriod.details}`,
        ruleSource: warrantyPeriod.ruleSource
      };
  }
  
  return { status: 'No Estimable', message: "El S/N no contiene patrón de fecha reconocible (YYMMDD o YYWW).", estimationDetails: `No se encontró patrón de fecha en '${serialNumber}'. ${warrantyPeriod.details}`, ruleSource: warrantyPeriod.ruleSource };
};


export const getWarrantyStatusBgColor = (status?: WarrantyInfo['status']) => {
    switch (status) {
        case 'Activa': return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        case 'Expirada': return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
        case 'Personalizada': return "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200";
        case 'Vitalicia': return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
        default: return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"; 
    }
};
