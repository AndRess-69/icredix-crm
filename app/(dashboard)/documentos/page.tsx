import { PageTitle } from "@/components/layout/page-title";
import { DocumentosSection } from "@/components/documentos/documentos-section";
import { getAdminDocuments } from "@/services/documentService";

export default async function DocumentosPage() {
  const documents = await getAdminDocuments();

  return (
    <>
      <PageTitle
        title="Documentos"
        description="Formatos y documentos administrativos de iCredix"
      />
      <DocumentosSection documents={documents} />
    </>
  );
}
