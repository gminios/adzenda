"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createAdAccountSchema,
  updateAdAccountSchema,
  type CreateAdAccountInput,
  type UpdateAdAccountInput,
} from "@/lib/schemas/ad-account";
import { createAdAccount, updateAdAccount } from "@/lib/actions/ad-accounts";

// ── Shared styles ───────────────────────────────────────────────────────────
const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#64748b] outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition";

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
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

// ── Create form ─────────────────────────────────────────────────────────────
export function CreateAdAccountForm({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<CreateAdAccountInput>({ resolver: zodResolver(createAdAccountSchema) });

  async function onSubmit(data: CreateAdAccountInput) {
    setServerError(null);
    const result = await createAdAccount(tenantId, data);
    if (!result.success) { setServerError(result.error); return; }
    router.push(`/settings/tenants/${tenantId}/accounts`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field
        label="ID de cuenta publicitaria"
        hint='Podés ingresar "123456789" o "act_123456789"'
        error={errors.metaAccountId?.message}
      >
        <input {...register("metaAccountId")} placeholder="act_123456789" className={inputClass} />
      </Field>

      <Field
        label="Token de acceso"
        hint="Token de sistema o token de página de Meta Business Manager"
        error={errors.accessToken?.message}
      >
        <input
          {...register("accessToken")}
          type="password"
          placeholder="EAAxxxxxxxxxx..."
          className={inputClass}
          autoComplete="off"
        />
      </Field>

      <p className="text-xs text-[#64748b]">
        Al guardar se verificará la conectividad con Meta API.
      </p>

      {serverError && <p className="text-sm text-[#f87171]">{serverError}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Verificando con Meta..." : "Conectar cuenta"}
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

// ── Edit form ────────────────────────────────────────────────────────────────
export function EditAdAccountForm({
  accountId,
  tenantId,
  initialName,
}: {
  accountId: string;
  tenantId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<UpdateAdAccountInput>({
      resolver: zodResolver(updateAdAccountSchema),
      defaultValues: { name: initialName, newAccessToken: "" },
    });

  async function onSubmit(data: UpdateAdAccountInput) {
    setServerError(null);
    const result = await updateAdAccount(accountId, tenantId, data);
    if (!result.success) { setServerError(result.error); return; }
    router.push(`/settings/tenants/${tenantId}/accounts`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Nombre de la cuenta" error={errors.name?.message}>
        <input {...register("name")} className={inputClass} />
      </Field>

      <Field
        label="Nuevo token de acceso"
        hint="Dejá vacío para mantener el token actual"
        error={errors.newAccessToken?.message}
      >
        <input
          {...register("newAccessToken")}
          type="password"
          placeholder="EAAxxxxxxxxxx..."
          className={inputClass}
          autoComplete="off"
        />
      </Field>

      {serverError && <p className="text-sm text-[#f87171]">{serverError}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
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
