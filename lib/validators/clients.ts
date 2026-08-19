import { z } from "zod";

const optionalText = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .or(z.literal(""));

export const clientSchema = z.object({
  first_name: z.string().trim().min(1, "El nombre es requerido").max(100),
  last_name: z.string().trim().min(1, "El apellido es requerido").max(100),
  cedula: z
    .string()
    .trim()
    .min(1, "La cédula es requerida")
    .max(20, "La cédula es demasiado larga"),
  phone: z
    .string()
    .trim()
    .min(7, "El celular debe tener al menos 7 dígitos")
    .max(15, "El celular es demasiado largo"),
  email: z.string().trim().max(200).email("Ingresa un correo válido").optional().or(z.literal("")),
  address: optionalText(255),
  city: optionalText(100),
  birth_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .optional()
    .or(z.literal("")),
  notes: optionalText(1000),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

export const clientValidationSchema = z.object({
  status: z.enum(["pendiente", "en_estudio", "aprobado", "rechazado"]),
  request_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .optional()
    .or(z.literal("")),
  result: z
    .string()
    .trim()
    .max(500, "El resultado es demasiado largo")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(1000, "Las observaciones son demasiado largas")
    .optional()
    .or(z.literal("")),
});

export type ClientValidationFormValues = z.infer<typeof clientValidationSchema>;
