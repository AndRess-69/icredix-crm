import { PageTitle } from "@/components/layout/page-title";
import { CreditsTable } from "@/components/creditos/credits-table";
import { getCredits } from "@/services/creditService";
import { getClientOptions } from "@/services/clientService";
import { getDeviceReferenceOptions } from "@/services/deviceReferenceService";
import { getCompanySettings } from "@/services/companyService";

export default async function CreditosPage() {
  const [credits, clients, deviceReferences, settings] = await Promise.all([
    getCredits(),
    getClientOptions(),
    getDeviceReferenceOptions(),
    getCompanySettings(),
  ]);

  return (
    <>
      <PageTitle
        title="Créditos"
        description="Administración de créditos de iCredix"
      />
      <CreditsTable
        credits={credits}
        clients={clients}
        deviceReferences={deviceReferences}
        interestRate={settings?.interest_rate ?? 0}
      />
    </>
  );
}
