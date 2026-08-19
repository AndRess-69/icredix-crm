import { PageTitle } from "@/components/layout/page-title";
import { BloqueosClient } from "@/components/bloqueos/bloqueos-client";
import {
  getBlocks,
  getUnblocks,
  getUnblockCandidates,
} from "@/services/blockService";
import { getClientOptions } from "@/services/clientService";
import { getPayments } from "@/services/paymentService";

export default async function BloqueosPage() {
  const [blocks, unblocks, clients, payments, candidates] = await Promise.all([
    getBlocks(),
    getUnblocks(),
    getClientOptions(),
    getPayments(),
    getUnblockCandidates(),
  ]);

  return (
    <>
      <PageTitle
        title="Bloqueos"
        description="Gestión de solicitudes de bloqueo y desbloqueo de equipos"
      />
      <div className="space-y-6">
        <BloqueosClient
          blocks={blocks}
          unblocks={unblocks}
          clients={clients}
          payments={payments}
          candidates={candidates}
        />
      </div>
    </>
  );
}
