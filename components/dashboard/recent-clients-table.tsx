import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDate,
  getClientFullName,
} from "@/lib/utils/format";
import type { Client } from "@/types";

interface RecentClientsTableProps {
  clients: Client[];
}

export function RecentClientsTable({ clients }: RecentClientsTableProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Últimos clientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay clientes registrados aún.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Celular</TableHead>
                <TableHead>Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    {getClientFullName(client.first_name, client.last_name)}
                  </TableCell>
                  <TableCell>{client.cedula}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(client.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
