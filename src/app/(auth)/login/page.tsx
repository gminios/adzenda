"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginForm) {
    setError(null);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email o contraseña incorrectos");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0b1e] via-[#1a1333] to-[#0d1b2a] p-4">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-indigo-500/20 blur-[100px]" />
        <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-purple-500/15 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-[#f1f5f9]">AdZenda</h1>
            <p className="mt-1 text-sm text-[#94a3b8]">Panel de administración</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                Email
              </label>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="admin@ejemplo.com"
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#64748b] outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-[#f87171]">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                Contraseña
              </label>
              <input
                {...register("password")}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#64748b] outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-[#f87171]">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-[#f87171] text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
