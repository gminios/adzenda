import { z } from "zod";

export const createAdAccountSchema = z.object({
  metaAccountId: z
    .string()
    .min(1, "Ingresá el ID de la cuenta publicitaria")
    .transform((v) => (v.startsWith("act_") ? v : `act_${v}`)),
  accessToken: z.string().min(10, "Ingresá el token de acceso de Meta"),
});

export const updateAdAccountSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
  newAccessToken: z
    .string()
    .min(10, "El token debe tener al menos 10 caracteres")
    .optional()
    .or(z.literal("")),
});

export type CreateAdAccountInput = z.infer<typeof createAdAccountSchema>;
export type UpdateAdAccountInput = z.infer<typeof updateAdAccountSchema>;
