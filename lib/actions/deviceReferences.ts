"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cacheInvalidate } from "@/lib/cache";
import {
  deviceReferenceSchema,
  type DeviceReferenceFormValues,
} from "@/lib/validators/deviceReferences";
import { requireRole, requireUser } from "@/lib/auth-guard";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function createDeviceReferenceAction(
  values: DeviceReferenceFormValues
): Promise<ActionResult> {
  const parsed = deviceReferenceSchema.safeParse(values);

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

  const { error } = await supabase.rpc("create_device_reference", {
    p_brand: data.brand,
    p_model: data.model,
    p_capacity: data.capacity ?? "",
    p_color: data.color ?? "",
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe una referencia con esos datos" };
    }
    return { success: false, error: error.message };
  }

  cacheInvalidate("svc");
  revalidatePath("/equipos");
  return { success: true };
}

export async function updateDeviceReferenceAction(
  id: string,
  values: DeviceReferenceFormValues
): Promise<ActionResult> {
  const parsed = deviceReferenceSchema.safeParse(values);

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

  const { error } = await supabase.rpc("update_device_reference", {
    p_id: id,
    p_brand: data.brand,
    p_model: data.model,
    p_capacity: data.capacity ?? "",
    p_color: data.color ?? "",
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe una referencia con esos datos" };
    }
    return { success: false, error: error.message };
  }

  cacheInvalidate("svc");
  revalidatePath("/equipos");
  return { success: true };
}

export async function deleteDeviceReferenceAction(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireRole(["admin"]))) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await supabase.rpc("delete_device_reference", {
    p_id: id,
  });

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/equipos");
  return { success: true };
}
