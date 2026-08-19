"use client";

import * as React from "react";

import { BlockUnifiedTable } from "@/components/bloqueos/block-unified-table";
import { RequestTypeSelector } from "@/components/bloqueos/request-type-selector";
import { UnblockCandidatesPanel } from "@/components/bloqueos/unblock-candidates-panel";
import {
  UnblockFormDialog,
  type UnblockFormPrefill,
} from "@/components/bloqueos/unblock-form-dialog";
import type {
  BlockWithRelations,
  ClientOption,
  PaymentWithRelations,
  UnblockCandidate,
  UnblockWithRelations,
} from "@/types";

interface BloqueosClientProps {
  blocks: BlockWithRelations[];
  unblocks: UnblockWithRelations[];
  clients: ClientOption[];
  payments: PaymentWithRelations[];
  candidates: UnblockCandidate[];
}

export function BloqueosClient({
  blocks,
  unblocks,
  clients,
  payments,
  candidates,
}: BloqueosClientProps) {
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [unblockFormOpen, setUnblockFormOpen] = React.useState(false);
  const [prefill, setPrefill] = React.useState<UnblockFormPrefill | null>(null);

  const handleCandidateRequest = React.useCallback(
    (candidate: UnblockCandidate) => {
      setPrefill({
        client_id: candidate.client?.id ?? "",
        imei: candidate.device.imei,
        credit_id: candidate.credit?.id ?? null,
        device_id: candidate.device.id,
      });
      setUnblockFormOpen(true);
    },
    []
  );

  return (
    <>
      {candidates.length > 0 && (
        <UnblockCandidatesPanel
          candidates={candidates}
          onRequestUnblock={handleCandidateRequest}
        />
      )}

      <BlockUnifiedTable
        blocks={blocks}
        unblocks={unblocks}
        onCreateRequest={() => setSelectorOpen(true)}
      />

      <RequestTypeSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        clients={clients}
        payments={payments}
      />

      <UnblockFormDialog
        open={unblockFormOpen}
        onOpenChange={setUnblockFormOpen}
        clients={clients}
        payments={payments}
        prefill={prefill}
      />
    </>
  );
}
