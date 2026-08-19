"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { cacheInvalidate } from "@/lib/cache";
import { requireRole, requireUser } from "@/lib/auth-guard";

export interface ActionResult {
  success: boolean;
  error?: string;
}

const createDocumentSchema = z.object({
  title: z.string().trim().min(1, "El título es requerido").max(200),
  description: z
    .string()
    .trim()
    .max(500, "La descripción es demasiado larga")
    .optional()
    .or(z.literal("")),
  file_url: z.string().trim().min(1, "El archivo es requerido"),
  file_type: z.string().trim().max(100).optional().or(z.literal("")),
});

export type CreateDocumentValues = z.infer<typeof createDocumentSchema>;

export async function createDocumentAction(
  values: CreateDocumentValues
): Promise<ActionResult> {
  const parsed = createDocumentSchema.safeParse(values);

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("documents").insert({
    title: data.title,
    description: data.description ? data.description : null,
    file_url: data.file_url,
    file_type: data.file_type ? data.file_type : null,
    created_by: user?.id ?? null,
  });

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/documentos");
  return { success: true };
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireRole(["admin"]))) {
    return { success: false, error: "No autorizado" };
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, file_url")
    .eq("id", id)
    .maybeSingle();

  if (doc?.file_url) {
    await supabase.storage
      .from("documents")
      .remove([doc.file_url]);
  }

  const { error } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/documentos");
  return { success: true };
}
