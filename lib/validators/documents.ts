import { z } from "zod";
import { DOCUMENT_TYPES } from "@/lib/constants/documents";

const docTypeValues = DOCUMENT_TYPES.map((doc) => doc.value) as [
  (typeof DOCUMENT_TYPES)[number]["value"],
  ...(typeof DOCUMENT_TYPES)[number]["value"][],
];

export const clientDocumentSchema = z.object({
  doc_type: z.enum(docTypeValues, {
    message: "Selecciona el tipo de documento",
  }),
  name: z.string().trim().min(1, "El nombre es requerido").max(200),
  file_url: z.string().trim().min(1, "El archivo es requerido"),
  file_type: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(500, "Las observaciones son demasiado largas")
    .optional()
    .or(z.literal("")),
  credit_id: z.string().uuid("Crédito inválido").optional().or(z.literal("")),
});

export type ClientDocumentFormValues = z.infer<typeof clientDocumentSchema>;
