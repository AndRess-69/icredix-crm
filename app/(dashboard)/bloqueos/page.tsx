import { PageTitle } from "@/components/layout/page-title";
import { BlocksTable } from "@/components/bloqueos/blocks-table";
import { UnblocksTable } from "@/components/bloqueos/unblocks-table";
import { getBlocks, getUnblocks, getUnblockCandidates } from "@/services/blockService";
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
        description="Solicitudes de bloqueo y desbloqueo"
      />
      <div className="space-y-6">
        <BlocksTable blocks={blocks} clients={clients} />
        <UnblocksTable
          unblocks={unblocks}
          clients={clients}
          payments={payments}
          candidates={candidates}
        />
      </div>
    </>
  );
}
