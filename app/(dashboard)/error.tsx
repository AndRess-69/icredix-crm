"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card py-24 text-center">
      <h2 className="text-lg font-semibold text-foreground">Algo salió mal</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Ocurrió un error inesperado al cargar esta sección.
      </p>
      <Button onClick={reset} variant="outline">
        Intentar de nuevo
      </Button>
    </div>
  );
}
