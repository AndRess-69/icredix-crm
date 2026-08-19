import { z } from "zod";

const optionalText = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .or(z.literal(""));

export const companySettingsSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(100),
  address: optionalText(255),
  city: optionalText(100),
  phone: optionalText(20),
  email: z
    .string()
    .trim()
    .max(200)
    .email("Ingresa un correo válido")
    .optional()
    .or(z.literal("")),
  telegram_token: optionalText(255),
  telegram_chat_id: optionalText(100),
  interest_rate: z
    .number("Ingresa un porcentaje válido")
    .min(0, "El porcentaje de interés no puede ser negativo")
    .max(100, "El porcentaje de interés máximo es 100%"),
});

export type CompanySettingsValues = z.infer<typeof companySettingsSchema>;

export const googleSheetConfigSchema = z.object({
  google_script_url: z.string().trim().max(500).optional().or(z.literal("")),
  google_script_token: z.string().trim().max(255).optional().or(z.literal("")),
});

export type GoogleSheetConfigValues = z.infer<typeof googleSheetConfigSchema>;
