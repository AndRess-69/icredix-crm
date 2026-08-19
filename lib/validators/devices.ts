import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""));

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .optional()
  .or(z.literal(""));

export const deviceSchema = z.object({
  brand: z.string().trim().min(1, "La marca es requerida").max(50),
  model: z.string().trim().min(1, "El modelo es requerido").max(100),
  capacity: optionalText(30),
  color: optionalText(50),
  imei: z
    .string()
    .trim()
    .regex(/^\d{15}$/, "El IMEI debe tener exactamente 15 dígitos")
    .optional()
    .or(z.literal("")),
  imei2: z
    .string()
    .trim()
    .regex(/^\d{15}$/, "El IMEI 2 debe tener exactamente 15 dígitos")
    .optional()
    .or(z.literal("")),
  purchase_date: optionalDate,
  delivery_date: optionalDate,
  notes: optionalText(1000),
});

export type DeviceFormValues = z.infer<typeof deviceSchema>;
