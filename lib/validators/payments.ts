import { z } from "zod";
import { PAYMENT_METHODS } from "@/types";

export const paymentFormSchema = z.object({
  credit_id: z.string().uuid("Selecciona un crédito"),
  installment_id: z.string().uuid("Selecciona la cuota a pagar"),
  method: z.enum(PAYMENT_METHODS, "Selecciona un método de pago"),
  reference: z
    .string()
    .trim()
    .max(100, "La referencia es demasiado larga")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(1000, "Las notas son demasiado largas")
    .optional()
    .or(z.literal("")),
  amount: z
    .number("Ingresa un valor válido")
    .positive("El valor del pago debe ser mayor a 0")
    .optional(),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
