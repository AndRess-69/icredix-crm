import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCreditStatusInfo } from "@/lib/utils/status";
import { formatCurrency } from "@/lib/utils/format";
import type { CreditStatusSummary } from "@/types";

interface CreditsSummaryTableProps {
  data: CreditStatusSummary[];
}

export function CreditsSummaryTable({ data }: CreditsSummaryTableProps) {
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);
  const totalFinanced = data.reduce((sum, item) => sum + item.financed, 0);
  const totalBalance = data.reduce((sum, item) => sum + item.balance, 0);

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Créditos por estado
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">N° créditos</TableHead>
                <TableHead className="text-right">Total financiado</TableHead>
                <TableHead className="text-right">Saldo por cobrar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const info = getCreditStatusInfo(item.status);
                return (
                  <TableRow key={item.status}>
                    <TableCell>
                      <Badge variant={info.variant}>{info.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.financed)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.balance)}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/20 font-medium">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{totalCount}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalFinanced)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalBalance)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
