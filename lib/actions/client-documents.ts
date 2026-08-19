"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cacheInvalidate } from "@/lib/cache";
import { requireRole, requireUser } from "@/lib/auth-guard";
import {
  clientDocumentSchema,
  type ClientDocumentFormValues,
} from "@/lib/validators/documents";
import type { ClientDocumentWithUrl } from "@/types";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function createClientDocumentAction(
  clientId: string,
  values: ClientDocumentFormValues
): Promise<ActionResult> {
  const parsed = clientDocumentSchema.safeParse(values);

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

  const { error } = await supabase.from("client_documents").insert({
    client_id: clientId,
    name: data.name,
    file_url: data.file_url,
    file_type: data.file_type ? data.file_type : null,
    doc_type: data.doc_type,
    notes: data.notes ? data.notes : null,
    credit_id: data.credit_id && data.credit_id !== "none" ? data.credit_id : null,
    created_by: user?.id ?? null,
  });

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath(`/clientes/${clientId}`);
  return { success: true };
}

export async function deleteClientDocumentAction(
  id: string,
  clientId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  if (!(await requireRole(["admin"]))) {
    return { success: false, error: "No autorizado" };
  }

  const { data: doc } = await supabase
    .from("client_documents")
    .select("id, file_url")
    .eq("id", id)
    .maybeSingle();

  if (doc?.file_url) {
    await supabase.storage.from("documents").remove([doc.file_url]);
  }

  const { error } = await supabase
    .from("client_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { success: false, error: error.message };

  cacheInvalidate("svc");
  revalidatePath(`/clientes/${clientId}`);
  return { success: true };
}

export async function getClientDocumentsAction(
  clientId: string
): Promise<ClientDocumentWithUrl[]> {
  if (!(await requireUser())) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("client_documents")
    .select(
      "id, client_id, name, file_url, file_type, doc_type, notes, created_by, credit_id, created_at, updated_at, deleted_at, uploaded_by:profiles(full_name)"
    )
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const signedResults = await Promise.all(
    data.map((doc) =>
      supabase.storage
        .from("documents")
        .createSignedUrl(doc.file_url, 3600)
        .then(({ data: signed }) => {
          const uploadedBy = Array.isArray(doc.uploaded_by)
            ? doc.uploaded_by[0]
            : doc.uploaded_by;
          return {
            id: doc.id,
            client_id: doc.client_id,
            name: doc.name,
            file_url: doc.file_url,
            file_type: doc.file_type,
            doc_type: doc.doc_type,
            notes: doc.notes,
            created_by: doc.created_by,
            credit_id: doc.credit_id,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            deleted_at: doc.deleted_at,
            signed_url: signed?.signedUrl ?? "",
            uploaded_by_name: uploadedBy?.full_name ?? null,
          };
        })
    )
  );

  return signedResults;
}
