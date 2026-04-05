
"use client";

import { QRCodeCanvas } from 'qrcode.react';
import type { Herramienta } from '@/lib/herramientas-storage';
import type { LabelSettings, LabelField } from '@/lib/label-settings-storage';
import { cn } from '@/lib/utils';
import React from 'react';

interface LabelPreviewProps {
    settings: LabelSettings;
    tool: Partial<Herramienta>;
    className?: string;
}

export const sampleTool: Partial<Herramienta> = {
    id: 'H-20240101-PREVW',
    toolName: 'M18 FUEL Impact Driver',
    condicion: 'Nueva',
    precio: 199.99,
    catNo: '2767-20',
    serialNumber: 'X123456789',
};

const convertToMm = (value: number, unit: LabelSettings['unit']): number => {
    switch (unit) {
        case 'cm': return value * 10;
        case 'in': return value * 25.4;
        case 'mm':
        default:
            return value;
    }
};

const hasField = (fields: LabelField[], field: LabelField) => fields.includes(field);

export function LabelPreview({ settings, tool, className }: LabelPreviewProps) {
    const { 
        width, height, unit, fields, 
        structure, qrPosition, textAlign,
        fontSizeToolName, fontSizeDetails, qrCodeSize,
        fontSizePrice, pricePositionX, pricePositionY,
        fontSizeCondition, conditionPositionX, conditionPositionY
    } = settings;
    
    const width_mm = convertToMm(width, unit);
    const height_mm = convertToMm(height, unit);

    const mainContainerClasses = cn(
        'flex p-1 h-full w-full gap-1 relative', // Added relative positioning
        structure === 'horizontal' ? 'flex-row' : 'flex-col'
    );
    
    const qrOrderClass = qrPosition === 'start' ? 'order-first' : 'order-last';

    const textContainerClasses = cn(
        'flex-grow flex flex-col justify-between overflow-hidden',
        {
            'text-left items-start': textAlign === 'left',
            'text-center items-center': textAlign === 'center',
            'text-right items-end': textAlign === 'right',
        }
    );

    const qrMinorAxisSizeMm = structure === 'horizontal' ? height_mm - 2 : width_mm - 2;
    const qrSizePx = qrMinorAxisSizeMm * (qrCodeSize / 100) * 3.78; // Convert mm to approx px

    const qrWrapperStyle: React.CSSProperties = {
        padding: '1mm',
        ...(structure === 'horizontal'
            ? { width: `${height_mm}mm`, height: `${height_mm}mm` }
            : { width: `${width_mm}mm`, height: `${width_mm}mm` })
    };
    
    const qrCanvasStyle: React.CSSProperties = {
        width: `${qrCodeSize}%`,
        height: `${qrCodeSize}%`,
    };

    return (
        <div
            className={cn(
                'bg-white border border-dashed border-gray-500 text-black font-sans overflow-hidden',
                className
            )}
            style={{
                width: `${width_mm}mm`,
                height: `${height_mm}mm`,
                fontFamily: '"Arial Narrow", Arial, "Helvetica Neue", Helvetica, sans-serif',
            }}
        >
            <div className={mainContainerClasses}>
                {hasField(fields, 'qrCode') && (
                     <div className={cn('flex-none flex items-center justify-center', qrOrderClass)} style={qrWrapperStyle}>
                        <QRCodeCanvas value={tool.id || 'SAMPLE_ID'} size={qrSizePx} bgColor="#ffffff" fgColor="#000000" level="L" includeMargin={false} style={qrCanvasStyle}/>
                    </div>
                )}
                
                <div className={textContainerClasses}>
                    {hasField(fields, 'toolName') && (
                        <div className="font-bold leading-tight" style={{ fontSize: `${fontSizeToolName}px` }}>
                            {tool.toolName || 'Nombre de Herramienta'}
                        </div>
                    )}
                    
                    {(hasField(fields, 'catNo') || hasField(fields, 'serialNumber') || hasField(fields, 'toolId')) && (
                        <div className="w-full text-gray-800 border-t border-black mt-auto pt-0.5 leading-tight truncate" style={{ fontSize: `${fontSizeDetails}px` }}>
                            {hasField(fields, 'catNo') && <span className="mr-2">CAT: {tool.catNo || 'N/A'}</span>}
                            {hasField(fields, 'serialNumber') && <span className="mr-2">S/N: {tool.serialNumber || 'N/A'}</span>}
                            {hasField(fields, 'toolId') && <div className="truncate">ID: {tool.id || 'N/A'}</div>}
                        </div>
                    )}
                </div>

                 {/* Price and Condition are now outside the flex flow, positioned relative to the main container */}
                 {hasField(fields, 'price') && (
                    <div 
                        className="font-bold leading-none absolute pointer-events-none" 
                        style={{ 
                            fontSize: `${fontSizePrice}px`,
                            top: `calc(50% + ${pricePositionY}%)`,
                            left: `calc(50% + ${pricePositionX / 2}%)`, // Divide by 2 to map -100 to -50 and 100 to 50
                            transform: `translate(-50%, -50%)`
                        }}
                    >
                        {tool.precio != null ? `$${Number(tool.precio).toFixed(2)}` : '$--.--'}
                    </div>
                )}
                {hasField(fields, 'condition') && (
                     <div 
                        className="font-semibold border border-black px-1 leading-tight text-center absolute pointer-events-none"
                        style={{
                            fontSize: `${fontSizeCondition}px`,
                            top: `calc(50% + ${conditionPositionY}%)`,
                            left: `calc(50% + ${conditionPositionX / 2}%)`, // Divide by 2 to map -100 to -50 and 100 to 50
                            transform: `translate(-50%, -50%)`
                        }}
                    >
                        {tool.condicion || 'N/A'}
                    </div>
                )}
            </div>
        </div>
    );
}
