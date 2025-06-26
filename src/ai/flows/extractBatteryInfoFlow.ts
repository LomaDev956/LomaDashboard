'use server';
/**
 * @fileOverview Extrae información específica (Area 1, Area 2 y Area 3) de una imagen de etiqueta de batería o producto.
 *
 * - extractBatteryInfo - Una función que extrae texto de los campos designados de una imagen.
 * - BatteryInfoInput - El tipo de entrada para la función extractBatteryInfo.
 * - BatteryInfoOutput - El tipo de retorno para la función extractBatteryInfo.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'zod';

const BatteryInfoInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "La imagen completa de la etiqueta de la batería o producto, como una URI de datos que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type BatteryInfoInput = z.infer<typeof BatteryInfoInputSchema>;

const BatteryInfoOutputSchema = z.object({
  area1Text: z.string().nullable().describe("Texto extraído del Área 1 (código junto a SER. o Li-ion, por ejemplo, L54AB232141150K o G29NHTBC 240229 3244807)"),
  area2Text: z.string().nullable().describe("Texto extraído del Área 2 (código CAT.NO., por ejemplo, 0960-20 o 48-11-1850)"),
  area3Text: z.string().nullable().describe("Texto extraído del Área 3 (descripción principal del producto, por ejemplo, '1.6 Gal (6.1L) WET/DRY VACUUM' o 'M18 REDLITHIUM XC5.0')"),
});
export type BatteryInfoOutput = z.infer<typeof BatteryInfoOutputSchema>;

export async function extractBatteryInfo(input: BatteryInfoInput): Promise<BatteryInfoOutput> {
  if (!input.imageDataUri || !input.imageDataUri.startsWith('data:image')) {
    console.error("Invalid imageDataUri provided to extractBatteryInfo flow");
    return { area1Text: "Error: Imagen no válida.", area2Text: "Error: Imagen no válida.", area3Text: "Error: Imagen no válida." };
  }
  try {
    return await extractBatteryInfoFlow(input);
  } catch (error) {
    console.error("Error in extractBatteryInfoFlow:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { area1Text: `Error: ${errorMessage}`, area2Text: `Error: ${errorMessage}`, area3Text: `Error: ${errorMessage}` };
  }
}

const extractTextPrompt = ai.definePrompt({
  name: 'extractBatteryInfoPrompt',
  model: googleAI.model('gemini-pro'),
  input: {schema: BatteryInfoInputSchema},
  output: {schema: BatteryInfoOutputSchema},
  prompt: `Eres un experto en leer texto de imágenes, específicamente de etiquetas de productos y baterías.
Analiza la imagen proporcionada. Tu tarea es identificar y extraer texto de tres áreas específicas:

Area 1: Esta área se encuentra típicamente cerca de un identificador como "SER." (número de serie) o "Li-ion". Contiene un código de varias partes, a menudo formado por caracteres alfanuméricos, y puede incluir espacios o guiones. Debes extraer el código completo que sigue a "SER.", "Li-ion" o un símbolo similar. Por ejemplo, si ves "SER. L54AB232141150K", debes extraer "L54AB232141150K". Si ves "Li-ion G29NHTBC 240229 3244807", debes extraer "G29NHTBC 240229 3244807".

Area 2: Esta área está típicamente etiquetada como "CAT.NO." o similar. Contiene un número de catálogo, a menudo en un formato como "XXXX-XX" o "XX-XX-XXXX". Debes extraer este número de catálogo que sigue a "CAT.NO.". Por ejemplo, si ves "CAT.NO. 0960-20", debes extraer "0960-20". Otro ejemplo es "CAT. NO. 48-11-1850", del cual extraerías "48-11-1850".

Area 3: Esta área contiene la descripción principal del producto. A menudo, es el texto más grande y prominente que describe lo que es el artículo. Puede estar en varias líneas. Por ejemplo, para una aspiradora, podría ser "1.6 Gal (6.1L) WET/DRY VACUUM". Para una batería, a menudo es la combinación del modelo y la capacidad, como "M18 REDLITHIUM XC5.0". Extrae este texto descriptivo principal.

Si no puedes encontrar el texto para un área específica o el texto no es claramente legible, devuelve null para ese campo. No adivines ni inventes información. Presta atención a los detalles y asegúrate de extraer la secuencia de caracteres completa y correcta para cada área.

Image:
{{media url=imageDataUri}}`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  },
});

const extractBatteryInfoFlow = ai.defineFlow(
  {
    name: 'extractBatteryInfoFlow',
    inputSchema: BatteryInfoInputSchema,
    outputSchema: BatteryInfoOutputSchema,
  },
  async (input) => {
    const { output, usage } = await extractTextPrompt(input);

    if (!output) {
      console.warn("Battery info prompt returned no output for an image.");
      return { area1Text: null, area2Text: null, area3Text: null };
    }
    
    if (usage) {
        // console.log('Battery Info Extraction Token usage:', usage); // Intentionally commented out for cleaner logs
    }
    
    return output;
  }
);
