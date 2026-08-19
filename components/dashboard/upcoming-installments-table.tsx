import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatDate,
  getClientFullName,
} from "@/lib/utils/format";
import type { InstallmentWithRelations } from "@/types";

interface UpcomingInstallmentsTableProps {
  installments: InstallmentWithRelations[];
}

export function UpcomingInstallmentsTable({
  installments,
}: UpcomingInstallmentsTableProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Próximos vencimientos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {installments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay cuotas pendientes próximas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Crédito</TableHead>
                <TableHead>Cuota</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installments.map((installment) => {
                const client = installment.credit?.client;
                return (
                  <TableRow key={installment.id}>
                    <TableCell className="font-medium">
                      {client
                        ? getClientFullName(client.first_name, client.last_name)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {installment.credit?.credit_number ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">#{installment.number}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(installment.amount))}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(installment.due_date)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
