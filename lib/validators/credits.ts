import { z } from "zod";

export const creditFormSchema = z
  .object({
    client_id: z.string().uuid("Selecciona un cliente"),
    device_id: z.string().uuid().optional().or(z.literal("none")),
    device_reference_id: z.string().uuid().optional().or(z.literal("none")),
    imei: z
      .string()
      .trim()
      .regex(/^\d{15}$/, "El IMEI debe tener exactamente 15 dígitos")
      .optional()
      .or(z.literal("")),
    device_value: z
      .number("Ingresa un valor válido")
      .positive("El valor del equipo debe ser mayor a 0"),
    financed_amount: z
      .number("Ingresa un valor válido")
      .positive("El valor financiado debe ser mayor a 0"),
    initial_payment: z
      .number("Ingresa un valor válido")
      .min(0, "El abono inicial no puede ser negativo"),
    installments_count: z
      .number("Ingresa un valor válido")
      .int("Debe ser un número entero")
      .min(1, "Debe haber al menos 1 cuota")
      .max(60, "Máximo 60 cuotas"),
    start_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  })
  .refine((data) => data.device_value > data.initial_payment, {
    message: "La cuota inicial no puede ser mayor o igual al valor del equipo",
    path: ["initial_payment"],
  })
  .refine(
    (data) => data.financed_amount === data.device_value - data.initial_payment,
    {
      message:
        "El valor a financiar debe ser igual al valor del equipo menos la cuota inicial",
      path: ["device_value"],
    }
  );

export type CreditFormValues = z.infer<typeof creditFormSchema>;
