import { PageTitle } from "@/components/layout/page-title";
import { ClientsTable } from "@/components/clientes/clients-table";
import { getClients } from "@/services/clientService";

export default async function ClientesPage() {
  const clients = await getClients();

  return (
    <>
      <PageTitle title="Clientes" description="Gestión de clientes de iCredix" />
      <ClientsTable clients={clients} />
    </>
  );
}
