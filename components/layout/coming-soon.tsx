import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ComingSoonProps {
  module: string;
  phase: number;
}

export function ComingSoon({ module, phase }: ComingSoonProps) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0052FF]/10">
          <Construction className="h-8 w-8 text-[#0052FF]" />
        </div>
        <h2 className="text-lg font-semibold">{module}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Este módulo estará disponible en la Fase {phase} del desarrollo.
          La Fase 1 (Dashboard, autenticación y arquitectura) ya está activa.
        </p>
      </CardContent>
    </Card>
  );
}
