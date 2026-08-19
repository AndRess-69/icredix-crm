import { z } from "zod";

const imei = z
  .string()
  .trim()
  .regex(/^\d{15}$/, "El IMEI debe tener exactamente 15 dígitos");

const nullableText = <T extends z.ZodTypeAny>(field: T) =>
  z.union([field, z.literal("")]).optional();

export const blockFormSchema = z.object({
  client_id: z.string().uuid("Selecciona un cliente"),
  imei,
  reason: z
    .string()
    .trim()
    .min(3, "Escribe el motivo del bloqueo")
    .max(500, "El motivo es demasiado largo"),
  phone_line: z
    .string()
    .trim()
    .max(60, "La línea telefónica es demasiado larga")
    .optional()
    .or(z.literal("")),
  diagnoses: z
    .string()
    .trim()
    .max(2000, "Los diagnósticos son demasiado largos")
    .optional()
    .or(z.literal("")),
  credit_id: nullableText(z.string().uuid("Crédito inválido")),
  device_id: nullableText(z.string().uuid("Equipo inválido")),
  encargo_bloqueos_json: z
    .record(z.string(), z.unknown())
    .optional()
    .nullable(),
});

export type BlockFormValues = z.infer<typeof blockFormSchema>;

export const unblockFormSchema = z.object({
  client_id: z.string().uuid("Selecciona un cliente"),
  imei,
  payment_id: z.string().uuid().optional().or(z.literal("")),
  unblock_reason: z
    .string()
    .trim()
    .max(500, "El motivo es demasiado largo")
    .optional()
    .or(z.literal("")),
  phone_line: z
    .string()
    .trim()
    .max(60, "La línea telefónica es demasiado larga")
    .optional()
    .or(z.literal("")),
  diagnoses: z
    .string()
    .trim()
    .max(2000, "Los diagnósticos son demasiado largos")
    .optional()
    .or(z.literal("")),
  credit_id: nullableText(z.string().uuid("Crédito inválido")),
  device_id: nullableText(z.string().uuid("Equipo inválido")),
});

export type UnblockFormValues = z.infer<typeof unblockFormSchema>;