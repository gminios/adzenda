import { z } from "zod";

export const thresholdSchema = z.object({
  metric:      z.enum(["roas", "ctr", "cpc", "cpm", "frequency", "cpa"]),
  lowerBound:  z.coerce.number().positive("Debe ser mayor a 0"),
  upperBound:  z.coerce.number().positive("Debe ser mayor a 0"),
  tenantId:    z.string().uuid(),
}).refine((d) => d.upperBound > d.lowerBound, {
  message: "El límite superior debe ser mayor al límite inferior",
  path: ["upperBound"],
});

export type ThresholdInput = z.infer<typeof thresholdSchema>;
