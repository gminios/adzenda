"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const ARS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

type Format = "currency-ars" | "roas" | "ctr" | "number";

interface DataPoint {
  week: string; // "Sem 14"
  value: number;
}

interface Props {
  data: DataPoint[];
  color?: string;
  format?: Format;
}

function formatValue(v: number, format: Format): string {
  switch (format) {
    case "currency-ars": return ARS.format(v);
    case "roas": return `${v.toFixed(2)}x`;
    case "ctr": return `${v.toFixed(2)}%`;
    default: return v.toFixed(2);
  }
}

export function TrendChart({ data, color = "#6366f1", format = "number" }: Props) {
  const fmt = (v: number) => formatValue(v, format);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        <XAxis
          dataKey="week"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => fmt(v).split(" ")[0]}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(26,19,51,0.95)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "12px",
            fontSize: "12px",
            color: "#f1f5f9",
          }}
          formatter={(value) => [typeof value === "number" ? fmt(value) : String(value), ""]}
          labelStyle={{ color: "#94a3b8" }}
          cursor={{ stroke: "rgba(255,255,255,0.10)" }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ fill: color, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
