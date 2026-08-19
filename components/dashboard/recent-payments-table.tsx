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
  formatCurrency,
  formatDateTime,
  getClientFullName,
} from "@/lib/utils/format";
import type { PaymentWithRelations } from "@/types";

interface RecentPaymentsTableProps {
  payments: PaymentWithRelations[];
}

export function RecentPaymentsTable({ payments }: RecentPaymentsTableProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Últimos pagos</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay pagos registrados aún.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Crédito</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.client
                      ? getClientFullName(
                          payment.client.first_name,
                          payment.client.last_name
                        )
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {payment.credit?.credit_number ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">
                    {formatCurrency(Number(payment.amount))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(payment.created_at)}
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
