
# LOMA Tools - Gestión de Herramientas y Garantías

LOMA Tools es una aplicación web integral diseñada para la gestión eficiente de inventarios de herramientas, personal y procesos de garantía. Construida con tecnologías modernas como Next.js y Genkit, la aplicación ofrece una solución robusta y local (usa IndexedDB) que funciona directamente en el navegador sin necesidad de una base de datos externa.

![LOMA Tools Dashboard](https://placehold.co/800x450.png?text=LOMA+Tools+Dashboard)

## ✨ Características Principales

- **Gestión de Inventario de Herramientas:** Añade, edita y rastrea herramientas con detalles como CAT.NO., número de serie, fotos, condición (Nueva/Usada) y estado actual (Operativa, Requiere Reparación, Vendido).

- **Extracción de Datos con IA (OCR):** Utiliza la cámara de tu dispositivo o sube una foto de la etiqueta de una herramienta para que la inteligencia artificial extraiga y rellene automáticamente el CAT.NO., número de serie y nombre del producto.

- **Estimación de Garantía Automatizada:** La aplicación analiza el número de serie y el tipo de producto para estimar instantáneamente el estado de la garantía (Activa, Expirada, Vitalicia), basándose en políticas conocidas y reglas personalizadas.

- **Creación y Seguimiento de Listas de Garantía:** Agrupa fácilmente las herramientas que requieren reparación en una lista, asígnalas a un miembro del personal y sigue el estado del envío a garantía (En Preparación, Enviada, En Proceso, etc.).

- **Reportes Profesionales:** Genera e imprime reportes claros y profesionales para cada lista de garantía, incluyendo los datos del personal y los detalles de cada herramienta. También puedes exportar los datos a CSV, XLSX y PDF.

- **Gestión de Personal:** Mantén un directorio centralizado de los miembros del personal y colaboradores, con su información de contacto y dirección.

- **Módulo de Stock (Punto de Venta):** Visualiza todas las herramientas operativas listas para la venta. Un simple clic en "Vender" actualiza su estado y las retira del stock disponible.

- **Reglas de Garantía Personalizables:** Define tus propias reglas de garantía para productos específicos por su CAT.NO. Estas reglas tienen prioridad sobre la lógica de estimación estándar de la aplicación.

- **Utilidad de Captura de Imágenes:** Una interfaz dedicada para capturar y analizar imágenes, con controles avanzados de cámara y la misma capacidad de extracción de datos por IA.

## 🚀 Tecnología Utilizada

- **Framework:** Next.js (con App Router)
- **Lenguaje:** TypeScript
- **UI:** React, Tailwind CSS y componentes de ShadCN UI
- **Inteligencia Artificial:** Google AI a través de Genkit para OCR.
- **Almacenamiento de Datos:** IndexedDB, permitiendo que la aplicación funcione completamente en el lado del cliente sin necesidad de un backend o base de datos externa.

## 🏁 Cómo Empezar

Esta aplicación está diseñada para funcionar localmente en tu navegador.

### Prerrequisitos

- Node.js y npm (o yarn/pnpm) instalados.

### Instalación y Ejecución

1.  **Clonar el repositorio (si aplica):**
    ```bash
    git clone <url-del-repositorio>
    cd <directorio-del-proyecto>
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar la API de IA (Opcional pero Recomendado):**
    Para que las funciones de extracción de datos con IA funcionen, necesitas una clave de API de Google AI.
    - Crea un archivo llamado `.env.local` en la raíz del proyecto.
    - Añade tu clave de API al archivo de la siguiente manera:
      ```
      GOOGLE_API_KEY="TU_API_KEY_DE_GOOGLE_AI"
      ```

4.  **Iniciar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

5.  Abre tu navegador y navega a `http://localhost:3000`. La aplicación te redirigirá automáticamente al dashboard principal.

## 📂 Estructura de la Aplicación

- **/loma-dashboard**: Dashboard principal con un resumen general y accesos rápidos.
- **/loma-dashboard/herramientas**: Página principal para la gestión del inventario de herramientas.
- **/loma-dashboard/personal**: Directorio para administrar al personal.
- **/loma-dashboard/garantias**: Formulario para crear nuevas listas de envío a garantía.
- **/loma-dashboard/lista-garantias**: Visualización y gestión de todas las listas de garantía creadas.
- **/loma-dashboard/stock**: Módulo para ver y "vender" herramientas operativas.
- **/capture**: Utilidad independiente para captura y análisis de imágenes.
- **/manage-warranty**: Página para crear y gestionar reglas de garantía personalizadas.
- **/src/lib**: Contiene la lógica de negocio, como la interacción con IndexedDB (`*-storage.ts`) y los cálculos de garantía (`warranty-utils.ts`).
- **/src/ai**: Contiene los flujos de Genkit para las funciones de IA.
