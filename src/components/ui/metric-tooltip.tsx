"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const glossary: Record<string, string> = {
  ctr:         "Porcentaje de personas que tocaron tu anuncio después de verlo. Es como contar cuántos de los que miran tu vidriera entran al local.",
  cpc:         "Lo que te cobra Meta cada vez que alguien toca tu anuncio. Imaginá que es el precio de que alguien entre a tu local.",
  cpm:         "Lo que cuesta que 1.000 personas vean tu anuncio. Como el precio de un cartel en una avenida transitada.",
  roas:        "Por cada $1 que invertís en publicidad, cuánto vuelve en ventas. Si dice 4x, ganás $4 por cada $1 invertido.",
  frequency:   "Cuántas veces en promedio cada persona ya vio tu anuncio. Arriba de 4 empieza a cansar.",
  cpa:         "Cuánto te cuesta conseguir una venta o conversión. Mientras más bajo, mejor.",
  reach:       "Cantidad de personas diferentes que vieron tu anuncio. No cuenta repetidos.",
  impressions: "Cantidad total de veces que se mostró tu anuncio. Una persona puede verlo varias veces.",
  spend:       "Cuánta plata gastaste en publicidad en este período.",
  conversions: "Cantidad de acciones valiosas (ventas, mensajes, registros) que generaron tus anuncios.",
};

interface Props {
  metric: string;
  children: React.ReactNode;
  className?: string;
}

export function MetricTooltip({ metric, children, className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const hint = glossary[metric.toLowerCase()];
  if (!hint) return <span className={className}>{children}</span>;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <span
      ref={ref}
      className={cn("relative cursor-help underline decoration-dotted decoration-[#64748b] underline-offset-2", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((p) => !p)}
    >
      {children}
      {open && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-xl border border-white/10 bg-[#1a1333]/95 p-3 text-xs leading-relaxed text-[#cbd5e1] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {hint}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-white/10" />
        </span>
      )}
    </span>
  );
}
