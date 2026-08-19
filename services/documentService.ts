import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/cache";
import type { AdminDocumentWithUrl } from "@/types";

const SIGNED_URL_EXPIRY = 3600;

/**
 * Obtiene los documentos administrativos activos con URL firmada.
 */
export async function getAdminDocuments(): Promise<AdminDocumentWithUrl[]> {
  return withCache("svc:admin-documents", async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !data) return [];

    const signedResults = await Promise.all(
      data.map((doc) =>
        supabase.storage
          .from("documents")
          .createSignedUrl(doc.file_url, SIGNED_URL_EXPIRY)
          .then(({ data: signed }) => ({
            ...doc,
            signed_url: signed?.signedUrl ?? "",
          }))
      )
    );

    return signedResults;
  });
}
