import { PageTitle } from "@/components/layout/page-title";
import { PaymentsTable } from "@/components/pagos/payments-table";
import { getCreditsForPayment, getPayments } from "@/services/paymentService";

export default async function PagosPage() {
  const [payments, credits] = await Promise.all([
    getPayments(),
    getCreditsForPayment(),
  ]);

  return (
    <>
      <PageTitle title="Pagos" description="Registro y seguimiento de pagos" />
      <PaymentsTable payments={payments} credits={credits} />
    </>
  );
}
