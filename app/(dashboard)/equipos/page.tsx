import { PageTitle } from "@/components/layout/page-title";
import { DeviceReferencesTable } from "@/components/equipos/device-references-table";
import { getDeviceReferences } from "@/services/deviceReferenceService";

export default async function EquiposPage() {
  const references = await getDeviceReferences();

  return (
    <>
      <PageTitle
        title="Referencias de Equipos"
        description="Catálogo de referencias de equipos de iCredix"
      />
      <DeviceReferencesTable references={references} />
    </>
  );
}
