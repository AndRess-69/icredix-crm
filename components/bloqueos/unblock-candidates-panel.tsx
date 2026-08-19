"use client";

import * as React from "react";
import { Smartphone, Unlock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import type { UnblockCandidate } from "@/types";

interface UnblockCandidatesPanelProps {
  candidates: UnblockCandidate[];
  onRequestUnblock: (candidate: UnblockCandidate) => void;
}

export function UnblockCandidatesPanel({
  candidates,
  onRequestUnblock,
}: UnblockCandidatesPanelProps) {
  if (candidates.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="font-medium">Pendientes de desbloqueo</p>
          <p className="text-xs text-muted-foreground">
            Equipos operativamente bloqueados sin solicitud activa de desbloqueo.
          </p>
        </div>
        <Badge variant="secondary">{candidates.length}</Badge>
      </div>
      <ul className="divide-y">
        {candidates.map((candidate) => (
          <li
            key={candidate.device.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Smartphone className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">
                  {candidate.device.brand} {candidate.device.model}
                  {candidate.device.capacity ? ` · ${candidate.device.capacity}` : ""}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {candidate.device.imei}
                </p>
              </div>
            </div>
            <div className="min-w-0 max-w-xs flex-1 text-sm">
              {candidate.client ? (
                <p className="truncate">
                  {candidate.client.first_name} {candidate.client.last_name}
                  <span className="text-muted-foreground"> · {candidate.client.cedula}</span>
                </p>
              ) : (
                <p className="text-muted-foreground">Sin cliente asociado</p>
              )}
              {candidate.credit ? (
                <p className="text-xs text-muted-foreground">
                  {candidate.credit.credit_number} · {formatCurrency(candidate.credit.balance)}
                </p>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRequestUnblock(candidate)}
            >
              <Unlock className="size-3.5" />
              Solicitar desbloqueo
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}