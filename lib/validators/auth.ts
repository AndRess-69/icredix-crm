import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El usuario es requerido")
    .email("Ingresa un correo válido"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es requerido")
    .email("Ingresa un correo válido"),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
