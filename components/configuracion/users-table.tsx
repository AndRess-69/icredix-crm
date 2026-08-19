"use client";

import * as React from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { Users as UsersIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { formatDateTime } from "@/lib/utils/format";
import type { Profile } from "@/types";

interface UsersTableProps {
  users: Profile[];
}

export function UsersTable({ users }: UsersTableProps) {
  const columns = React.useMemo<LegacyColumnDef<Profile, unknown>[]>(
    () => [
      {
        accessorKey: "full_name",
        header: "Nombre",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.full_name}</span>
        ),
      },
      {
        accessorKey: "role",
        header: "Rol",
        cell: ({ row }) => (
          <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>
            {row.original.role === "admin" ? "Admin" : "Agente"}
          </Badge>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "destructive"}>
            {row.original.is_active ? "Activo" : "Inactivo"}
          </Badge>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Registrado",
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
    ],
    []
  );

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7000FF]/10 text-[#7000FF]">
            <UsersIcon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Usuarios</CardTitle>
            <CardDescription>
              Perfiles registrados en el sistema. Los nuevos usuarios se crean
              automáticamente al registrarse.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={users}
          searchable
          searchPlaceholder="Buscar por nombre..."
        />
      </CardContent>
    </Card>
  );
}
