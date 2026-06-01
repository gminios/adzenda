"use client";

import { useRef, useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  tenantSchema,
  type TenantInput,
  type TenantFormValues,
} from "@/lib/schemas/tenant";
import { createTenant, updateTenant } from "@/lib/actions/tenants";
import { cn } from "@/lib/utils";

interface TenantFormProps {
  initialData?: {
    id: string;
    name: string;
    slug: string;
    industry: string;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    notes?: string | null;
    reportTone?: string | null;
    targetRoas?: number | null;
    targetCpa?:  number | null;
  };
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#64748b] outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition";

export function TenantForm({ initialData }: TenantFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!initialData;
  const slugTouched = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TenantFormValues, unknown, TenantInput>({
    resolver: zodResolver(tenantSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          slug: initialData.slug,
          industry: initialData.industry,
          contactName: initialData.contactName ?? "",
          contactEmail: initialData.contactEmail ?? "",
          contactPhone: initialData.contactPhone ?? "",
          notes: initialData.notes ?? "",
          reportTone: (initialData.reportTone as "simple" | "detailed") ?? "simple",
          targetRoas: initialData.targetRoas ?? null,
          targetCpa:  initialData.targetCpa  ?? null,
        }
      : {
          industry: "fashion",
          name: "",
          slug: "",
          reportTone: "simple",
          targetRoas: null,
          targetCpa:  null,
        },
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (isEdit || slugTouched.current) return;
    const slug = (nameValue ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    setValue("slug", slug, { shouldDirty: false });
  }, [nameValue, isEdit, setValue]);

  async function onSubmit(data: TenantInput) {
    setServerError(null);
    const result = isEdit
      ? await updateTenant(initialData!.id, data)
      : await createTenant(data);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    router.push("/settings/tenants");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre del cliente" error={errors.name?.message}>
          <input {...register("name")} placeholder="La Moda de Julia" className={inputClass} />
        </Field>
        <Field label="Slug" error={errors.slug?.message} hint="Solo minúsculas, números y guiones">
          <input
            {...register("slug")}
            placeholder="la-moda-de-julia"
            className={inputClass}
            onFocus={() => { slugTouched.current = true; }}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Contacto" error={errors.contactName?.message}>
          <input {...register("contactName")} placeholder="Julia García" className={inputClass} />
        </Field>
        <Field label="Email" error={errors.contactEmail?.message}>
          <input {...register("contactEmail")} type="email" placeholder="julia@ejemplo.com" className={inputClass} />
        </Field>
      </div>

      <Field label="Teléfono" error={errors.contactPhone?.message}>
        <input {...register("contactPhone")} placeholder="+54 11 1234-5678" className={cn(inputClass, "max-w-xs")} />
      </Field>

      <Field label="Notas internas" error={errors.notes?.message}>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="Notas sobre este cliente..."
          className={inputClass}
        />
      </Field>

      <Field label="Tono del informe" error={errors.reportTone?.message}>
        <div className="flex gap-3">
          {(["simple", "detailed"] as const).map((tone) => (
            <label
              key={tone}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition",
                watch("reportTone") === tone
                  ? "border-indigo-500/60 bg-indigo-500/15 text-[#f1f5f9]"
                  : "border-white/10 bg-white/[0.04] text-[#94a3b8] hover:bg-white/[0.08]"
              )}
            >
              <input
                type="radio"
                value={tone}
                {...register("reportTone")}
                className="sr-only"
              />
              {tone === "simple" ? "Resumido" : "Detallado"}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-[#64748b]">
          {watch("reportTone") === "simple"
            ? "Narrativa concisa, foco en las 3 principales acciones."
            : "Narrativa extendida con análisis por campaña y contexto de mercado."}
        </p>
      </Field>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <h3 className="text-sm font-semibold text-[#f1f5f9]">Objetivos del negocio</h3>
        <p className="mt-1 text-xs text-[#94a3b8]">
          Opcional. Si los cargás, el semáforo del dashboard pinta verde cuando el
          cliente alcanza estos números. Si no, se compara contra su propio promedio
          histórico (últimos 60 días).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="ROAS objetivo"
            error={errors.targetRoas?.message}
            hint="Ej: 3 significa que por cada $1 invertido se esperan $3 en ventas"
          >
            <input
              {...register("targetRoas")}
              type="number"
              step="0.1"
              min="0"
              placeholder="3.0"
              className={inputClass}
            />
          </Field>
          <Field
            label="CPA máximo aceptable"
            error={errors.targetCpa?.message}
            hint="Costo máximo por conversión en la moneda del cliente"
          >
            <input
              {...register("targetCpa")}
              type="number"
              step="1"
              min="0"
              placeholder="2500"
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      {serverError && <p className="text-sm text-[#f87171]">{serverError}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear cliente"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm text-[#94a3b8] transition hover:bg-white/10 hover:text-[#f1f5f9]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-[#64748b]">{hint}</p>}
      {error && <p className="mt-1 text-xs text-[#f87171]">{error}</p>}
    </div>
  );
}
