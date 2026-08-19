"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { cacheInvalidate } from "@/lib/cache";
import { requireRole, requireUser } from "@/lib/auth-guard";
import type { CreditDocumentWithUrl } from "@/types";

export interface ActionResult {
  success: boolean;
  error?: string;
}

const createCreditDocumentSchema = z.object({
  credit_id: z.string().uuid("Crédito inválido"),
  name: z.string().trim().min(1, "El nombre del archivo es requerido").max(200),
  file_url: z.string().trim().min(1, "El archivo es requerido"),
  file_type: z.string().trim().max(100).optional().or(z.literal("")),
});

export type CreateCreditDocumentValues = z.infer<
  typeof createCreditDocumentSchema
>;

export async function createCreditDocumentAction(
  values: CreateCreditDocumentValues
): Promise<ActionResult> {
  const parsed = createCreditDocumentSchema.safeParse(values);

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

  const { data: credit } = await supabase
    .from("credits")
    .select("id, client_id")
    .eq("id", data.credit_id)
    .maybeSingle();

  if (!credit) {
    return { success: false, error: "El crédito no existe" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("credit_documents").insert({
    credit_id: data.credit_id,
    client_id: credit.client_id,
    name: data.name,
    file_url: data.file_url,
    file_type: data.file_type ? data.file_type : null,
    created_by: user?.id ?? null,
  });

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/creditos");
  revalidatePath("/clientes");
  return { success: true };
}

export async function deleteCreditDocumentAction(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireRole(["admin"]))) {
    return { success: false, error: "No autorizado" };
  }

  const { data: doc } = await supabase
    .from("credit_documents")
    .select("id, file_url")
    .eq("id", id)
    .maybeSingle();

  if (doc?.file_url) {
    await supabase.storage
      .from("delivery-photos")
      .remove([doc.file_url]);
  }

  const { error } = await supabase
    .from("credit_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath("/creditos");
  revalidatePath("/clientes");
  return { success: true };
}

export async function getCreditDocumentsAction(
  creditId: string
): Promise<CreditDocumentWithUrl[]> {
  if (!(await requireUser())) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("credit_documents")
    .select("*")
    .eq("credit_id", creditId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const signedResults = await Promise.all(
    data.map((doc) =>
      supabase.storage
        .from("delivery-photos")
        .createSignedUrl(doc.file_url, 3600)
        .then(({ data: signed }) => ({
          ...doc,
          signed_url: signed?.signedUrl ?? "",
        }))
    )
  );

  return signedResults as CreditDocumentWithUrl[];
}
