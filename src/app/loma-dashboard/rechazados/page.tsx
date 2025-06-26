
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RechazadosPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Artículos Rechazados de Garantía</CardTitle>
        <CardDescription>
          Consulta los artículos que no fueron aceptados para reparación o reemplazo bajo garantía.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Aquí se mostrará la lista de artículos rechazados.
        </p>
        {/* Placeholder para la lista */}
      </CardContent>
    </Card>
  );
}
