import { notFound } from "next/navigation";
import { PageTitle } from "@/components/layout/page-title";
import { ExpedienteTabs } from "@/components/clientes/expediente/expediente-tabs";
import { getClientExpediente } from "@/services/clientExpedienteService";
import { getDeviceReferenceOptions } from "@/services/deviceReferenceService";
import { getCompanySettings } from "@/services/companyService";

export const dynamic = "force-dynamic";

export default async function ClienteExpedientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [expediente, deviceReferences, settings] = await Promise.all([
    getClientExpediente(id),
    getDeviceReferenceOptions(),
    getCompanySettings(),
  ]);

  if (!expediente) notFound();

  return (
    <>
      <PageTitle
        title={`${expediente.client.first_name} ${expediente.client.last_name}`.trim()}
        description={`C.C. ${expediente.client.cedula} · Expediente del cliente`}
      />
      <ExpedienteTabs
        expediente={expediente}
        deviceReferences={deviceReferences}
        interestRate={settings?.interest_rate ?? 0}
      />
    </>
  );
}
