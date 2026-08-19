import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const deviceReferenceSchema = z.object({
  brand: z.string().trim().min(1, "La marca es requerida").max(50),
  model: z.string().trim().min(1, "El modelo es requerido").max(100),
  capacity: optionalText(30),
  color: optionalText(50),
});

export type DeviceReferenceFormValues = z.infer<typeof deviceReferenceSchema>;
