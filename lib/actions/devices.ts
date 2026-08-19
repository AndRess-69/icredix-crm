"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { cacheInvalidate } from "@/lib/cache";
import { deviceSchema, type DeviceFormValues } from "@/lib/validators/devices";
import { requireRole, requireUser } from "@/lib/auth-guard";
import { DEVICE_STATUSES, type DeviceStatus } from "@/types";

export interface ActionResult {
  success: boolean;
  error?: string;
}

const deviceLifecycleSchema = z.object({
  status: z.enum(DEVICE_STATUSES, {
    message: "Estado de equipo inválido",
  }),
  imei2: z
    .string()
    .trim()
    .regex(/^\d{15}$/, "El IMEI 2 debe tener exactamente 15 dígitos")
    .optional()
    .or(z.literal("")),
  purchase_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .optional()
    .or(z.literal("")),
  delivery_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .optional()
    .or(z.literal("")),
});

export type DeviceLifecycleValues = z.infer<typeof deviceLifecycleSchema>;

function toNullable(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapInsertError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    return "Ya existe un equipo con ese IMEI";
  }
  return error.message;
}

export async function createDeviceAction(
  values: DeviceFormValues
): Promise<ActionResult> {
  const parsed = deviceSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  if (!(await requireUser())) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await supabase.from("devices").insert({
    brand: data.brand,
    model: data.model,
    capacity: toNullable(data.capacity),
    color: toNullable(data.color),
    imei: toNullable(data.imei),
    imei2: toNullable(data.imei2),
    purchase_date: toNullable(data.purchase_date),
    delivery_date: toNullable(data.delivery_date),
    notes: toNullable(data.notes),
  });

  if (error) return { success: false, error: mapInsertError(error) };

  cacheInvalidate("svc");
  revalidatePath("/equipos");
  return { success: true };
}

export async function updateDeviceAction(
  id: string,
  values: DeviceFormValues & { status?: DeviceStatus }
): Promise<ActionResult> {
  const parsed = deviceSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  if (!(await requireUser())) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await supabase
    .from("devices")
    .update({
      brand: data.brand,
      model: data.model,
      capacity: toNullable(data.capacity),
      color: toNullable(data.color),
      imei: toNullable(data.imei),
      imei2: toNullable(data.imei2),
      purchase_date: toNullable(data.purchase_date),
      delivery_date: toNullable(data.delivery_date),
      notes: toNullable(data.notes),
      status: values.status,
    })
    .eq("id", id);

  if (error) return { success: false, error: mapInsertError(error) };

  cacheInvalidate("svc");
  revalidatePath("/equipos");
  return { success: true };
}

export async function deleteDeviceAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireRole(["admin"]))) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await supabase
    .from("devices")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/equipos");
  return { success: true };
}

/**
 * Actualiza el ciclo de vida de un equipo (comprado → asignado → entregado),
 * con fechas e IMEI secundario. También notifica el nuevo estado.
 */
export async function updateDeviceLifecycleAction(
  id: string,
  values: DeviceLifecycleValues
): Promise<ActionResult> {
  const parsed = deviceLifecycleSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  if (!(await requireUser())) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await supabase
    .from("devices")
    .update({
      status: data.status,
      imei2: toNullable(data.imei2),
      purchase_date: toNullable(data.purchase_date),
      delivery_date: toNullable(data.delivery_date),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/equipos");
  revalidatePath("/clientes");
  return { success: true };
}
