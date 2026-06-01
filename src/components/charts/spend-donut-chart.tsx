"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#6366f1", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#64748b"];

const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export interface SpendSlice {
  name: string;
  spend: number;
  pct: number;
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: SpendSlice;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-[rgba(26,19,51,0.95)] px-3 py-2 text-xs shadow-lg backdrop-blur-xl">
      <p className="font-semibold text-[#f1f5f9]">{slice.name}</p>
      <p className="mt-1 text-[#94a3b8]">{ARS.format(slice.spend)}</p>
      <p className="text-[#94a3b8]">{slice.pct.toFixed(1)}%</p>
    </div>
  );
}

export function SpendDonutChart({ data }: { data: SpendSlice[] }) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="shrink-0">
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="spend"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-1 flex-col gap-2">
        {data.map((slice, i) => (
          <li key={slice.name} className="flex items-center gap-3">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-[#94a3b8]">{slice.name}</span>
            <span className="text-sm font-medium text-[#f1f5f9]">{slice.pct.toFixed(1)}%</span>
            <span className="text-xs text-[#64748b]">{ARS.format(slice.spend)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
