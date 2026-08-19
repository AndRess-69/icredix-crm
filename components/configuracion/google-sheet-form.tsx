"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileSpreadsheet, Loader2, Plug, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  updateGoogleSheetConfigAction,
  testGoogleSheetAction,
  syncAllToSheetAction,
} from "@/lib/actions/company";
import {
  googleSheetConfigSchema,
  type GoogleSheetConfigValues,
} from "@/lib/validators/company";
import type { CompanySettingsPublic } from "@/types";

interface GoogleSheetFormProps {
  settings: CompanySettingsPublic | null;
}

function toFormValues(
  settings: CompanySettingsPublic | null
): GoogleSheetConfigValues {
  return {
    google_script_url: settings?.google_script_url ?? "",
    google_script_token: "",
  };
}

export function GoogleSheetForm({ settings }: GoogleSheetFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<GoogleSheetConfigValues>({
    resolver: zodResolver(googleSheetConfigSchema),
    defaultValues: toFormValues(settings),
  });

  const saveConfig = async (): Promise<boolean> => {
    const result = await updateGoogleSheetConfigAction(getValues());
    if (!result.success) {
      toast.error(result.error ?? "Error al guardar la configuración");
      return false;
    }
    return true;
  };

  const onSave = async () => {
    setIsSaving(true);
    try {
      if (await saveConfig()) {
        toast.success("Configuración de la hoja guardada");
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const onTest = async () => {
    setIsTesting(true);
    try {
      if (!(await saveConfig())) return;
      const result = await testGoogleSheetAction();
      if (result.success) {
        toast.success(
          result.spreadsheetTitle
            ? `Conectado a "${result.spreadsheetTitle}"`
            : "Conexión correcta"
        );
      } else {
        toast.error(result.error ?? "No se pudo conectar con la hoja");
      }
    } finally {
      setIsTesting(false);
    }
  };

  const onSyncAll = async () => {
    setIsSyncing(true);
    try {
      if (!(await saveConfig())) return;
      const result = await syncAllToSheetAction();
      if (result.ok) {
        toast.success(
          `Sincronizados ${result.clients ?? 0} cliente(s), ${result.credits ?? 0} crédito(s), ${result.payments ?? 0} pago(s), ${result.blocks ?? 0} bloqueo(s) y ${result.unblocks ?? 0} desbloqueo(s)`
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al sincronizar");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0052FF]/10 text-[#0052FF]">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Google Sheets (segunda base de datos)
            </CardTitle>
            <CardDescription>
              Cada cliente nuevo, crédito aprobado, pago registrado y
              bloqueo/desbloqueo confirmado se agrega automáticamente a una hoja
              de cálculo de Google.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-decimal space-y-1 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <li>Crea una hoja en Google Sheets (puede estar vacía).</li>
          <li>
            En la hoja, abre «Extensiones → Apps Script», pega el contenido del
            archivo <code>backup.gs</code> que está en la carpeta{" "}
            <code>supabase/apps-script</code> y cámbiale el valor de{" "}
            <code>TOKEN</code> por un secreto propio.
          </li>
          <li>
            En Apps Script, pulsa «Implementar → Nueva implementación», elige
            «Aplicación web», «Ejecutar como: Yo» y «Acceso: Cualquier persona»,
            y copia la URL que se genera.
          </li>
          <li>
            Pega aquí la URL del Web App y el mismo token, y presiona «Probar
            conexión».
          </li>
        </ol>

        <div className="space-y-2">
          <Label htmlFor="google_script_url">URL del Web App</Label>
          <Input
            id="google_script_url"
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            {...register("google_script_url")}
            aria-invalid={!!errors.google_script_url}
          />
          {errors.google_script_url && (
            <p className="text-xs text-destructive">
              {errors.google_script_url.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Es la URL que genera Apps Script al implementar como aplicación web.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="google_script_token">Token secreto</Label>
          <Input
            id="google_script_token"
            type="password"
            placeholder={
              settings?.has_google_script_token
                ? "Token ya configurado"
                : "Escribe el mismo TOKEN que definiste en backup.gs"
            }
            autoComplete="off"
            {...register("google_script_token")}
            aria-invalid={!!errors.google_script_token}
          />
          {settings?.has_google_script_token && (
            <p className="text-xs text-muted-foreground">
              Ya hay un token configurado. Déjalo en blanco para conservarlo.
            </p>
          )}
          {errors.google_script_token && (
            <p className="text-xs text-destructive">
              {errors.google_script_token.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Se guarda en tu base de datos y se envía junto a cada escritura; el
            script la rechaza si no coincide.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={handleSubmit(onSave)} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Guardar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSubmit(onTest)}
            disabled={isTesting || isSaving}
          >
            {isTesting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plug className="size-4" />
            )}
            Probar conexión
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSubmit(onSyncAll)}
            disabled={isSyncing || isSaving}
          >
            {isSyncing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Sincronizar todo el historial
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
