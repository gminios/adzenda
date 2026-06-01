"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SemaphoreBadge } from "@/components/ui/semaphore-badge";
import { MetricTooltip } from "@/components/ui/metric-tooltip";
import type { SemaphoreColor } from "@/lib/benchmarks";

interface KpiCardProps {
  label: string;
  metric: string;
  value: string;
  semaphore: SemaphoreColor | null;
  semaphoreTitle?: string;
  pctChange: number | null;
  pctChangeLabel?: string;
  delay?: number;
}

export function KpiCard({
  label,
  metric,
  value,
  semaphore,
  semaphoreTitle,
  pctChange,
  pctChangeLabel = "vs período anterior",
  delay = 0,
}: KpiCardProps) {
  const isPositive = pctChange !== null && pctChange > 0;
  const isNegative = pctChange !== null && pctChange < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between">
        <MetricTooltip metric={metric} className="text-sm font-medium text-[#94a3b8]">
          {label}
        </MetricTooltip>
        {semaphore && <SemaphoreBadge color={semaphore} title={semaphoreTitle} />}
      </div>

      <p className="mt-3 text-3xl font-bold text-[#f1f5f9]">{value}</p>

      {pctChange !== null ? (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-xs",
            isPositive ? "text-[#34d399]" : isNegative ? "text-[#f87171]" : "text-[#64748b]"
          )}
        >
          {isPositive ? (
            <TrendingUp size={12} />
          ) : isNegative ? (
            <TrendingDown size={12} />
          ) : (
            <Minus size={12} />
          )}
          <span>
            {isPositive ? "+" : ""}{pctChange.toFixed(1)}% {pctChangeLabel}
          </span>
        </div>
      ) : (
        <p className="mt-2 text-xs text-[#64748b]">Sin datos previos</p>
      )}
    </motion.div>
  );
}
