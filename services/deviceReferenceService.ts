import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/cache";
import type { DeviceReference, DeviceReferenceOption } from "@/types";

const REFERENCE_LIST_LIMIT = 200;

/**
 * Obtiene todas las referencias activas (sin soft delete) para el catálogo.
 */
export async function getDeviceReferences(): Promise<DeviceReference[]> {
  return withCache("svc:device-references", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("device_references")
      .select("*")
      .is("deleted_at", null)
      .order("brand")
      .order("model")
      .limit(REFERENCE_LIST_LIMIT);

    if (error || !data) return [];
    return data;
  });
}

/**
 * Obtiene las referencias como opciones para formularios de crédito.
 */
export async function getDeviceReferenceOptions(): Promise<DeviceReferenceOption[]> {
  return withCache("svc:device-references-options", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("device_references")
      .select("id, brand, model, capacity, color")
      .is("deleted_at", null)
      .order("brand")
      .order("model")
      .limit(REFERENCE_LIST_LIMIT);

    if (error || !data) return [];
    return data;
  });
}
