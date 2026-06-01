import { z } from "zod";

const optionalPositive = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  })
  .refine((v) => v === null || v >= 0, "Debe ser un número positivo");

export const tenantSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  slug: z
    .string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  industry: z.string().min(1),
  contactName: z.string().max(100).optional(),
  contactEmail: z
    .string()
    .email("Email inválido")
    .max(100)
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
  reportTone: z.enum(["simple", "detailed"]),
  targetRoas: optionalPositive,
  targetCpa:  optionalPositive,
});

export type TenantInput = z.infer<typeof tenantSchema>;
export type TenantFormValues = z.input<typeof tenantSchema>;
