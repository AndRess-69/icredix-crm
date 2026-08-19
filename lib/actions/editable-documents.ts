"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { cacheInvalidate } from "@/lib/cache";
import { requireRole, requireUser } from "@/lib/auth-guard";
import type { EditableDocument } from "@/types";

export interface ActionResult {
  success: boolean;
  error?: string;
  id?: string;
}

const editableDocumentSchema = z.object({
  id: z.string().uuid("Documento inválido").optional(),
  doc_key: z.enum(["autorizacion", "ficha"]),
  client_name: z
    .string()
    .trim()
    .min(1, "El nombre del cliente es requerido")
    .max(200),
  cedula: z.string().trim().max(50).optional().or(z.literal("")),
  data: z.record(z.string(), z.string()),
});

export type SaveEditableDocumentValues = z.infer<
  typeof editableDocumentSchema
>;

export async function getEditableDocumentsAction(): Promise<EditableDocument[]> {
  if (!(await requireUser())) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_records")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data as EditableDocument[];
}

export async function saveEditableDocumentAction(
  values: SaveEditableDocumentValues
): Promise<ActionResult> {
  const parsed = editableDocumentSchema.safeParse(values);

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

  const { data: record, error } = await supabase
    .from("document_records")
    .upsert({
      id: data.id ?? crypto.randomUUID(),
      doc_key: data.doc_key,
      client_name: data.client_name,
      cedula: data.cedula ? data.cedula : "",
      data: data.data,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/documentos");
  return { success: true, id: record.id };
}

export async function deleteEditableDocumentAction(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireRole(["admin"]))) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await supabase
    .from("document_records")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/documentos");
  return { success: true, id };
}
