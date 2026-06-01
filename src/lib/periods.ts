export const PERIOD_OPTIONS = [
  { value: "7d",  label: "7 días",    days: 7,   description: "Últimos 7 días" },
  { value: "14d", label: "2 semanas", days: 14,  description: "Últimas 2 semanas" },
  { value: "21d", label: "3 semanas", days: 21,  description: "Últimas 3 semanas" },
  { value: "1m",  label: "Mes",       days: 30,  description: "Último mes" },
  { value: "3m",  label: "3 meses",   days: 90,  description: "Últimos 3 meses" },
  { value: "6m",  label: "6 meses",   days: 180, description: "Últimos 6 meses" },
] as const;

export type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];
