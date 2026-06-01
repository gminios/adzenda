"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SemaphoreBadge } from "@/components/ui/semaphore-badge";
import { MetricTooltip } from "@/components/ui/metric-tooltip";
import { getSemaphore, DEFAULT_THRESHOLDS, type MetricKey } from "@/lib/benchmarks";

// ── Types ────────────────────────────────────────────────────────────────────

interface AdMetrics {
  spend: number; impressions: number; clicks: number;
  conversions: number; conversionValue: number;
  roas: number; ctr: number; cpc: number; cpa: number;
}

interface AdRow    extends AdMetrics { id: string; name: string; status: string; }
interface AdSetRow extends AdMetrics { id: string; name: string; status: string; ads: AdRow[]; }
interface CampaignRow extends AdMetrics {
  id: string; name: string; status: string; adSets: AdSetRow[];
}

interface Props {
  campaigns: CampaignRow[];
  currency?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(v: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(v);
}
function fmtPct(v: number) { return `${v.toFixed(2)}%`; }
function fmtX(v: number)   { return `${v.toFixed(2)}x`; }

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   "text-[#34d399]",
  PAUSED:   "text-[#fbbf24]",
  ARCHIVED: "text-[#64748b]",
};

// ── Sub-components ───────────────────────────────────────────────────────────

function MetricCell({ value, metric }: { value: string; metric: MetricKey }) {
  const numVal = parseFloat(value.replace(/[^0-9.,]/g, "").replace(",", "."));
  const color = getSemaphore(metric, numVal, DEFAULT_THRESHOLDS[metric]);
  return (
    <td className="whitespace-nowrap py-2.5 pr-4 text-xs text-[#f1f5f9]">
      <span className="flex items-center gap-1.5">
        <SemaphoreBadge color={color} size="sm" />
        {value}
      </span>
    </td>
  );
}

function AdRow({ ad, currency }: { ad: AdRow; currency?: string }) {
  return (
    <tr className="border-b border-white/[0.03] bg-white/[0.01]">
      <td className="py-2.5 pl-16 pr-4 text-xs text-[#94a3b8]">
        <span className={cn("font-mono text-[10px]", STATUS_COLORS[ad.status] ?? "text-[#64748b]")}>
          {ad.status}
        </span>{" "}
        {ad.name}
      </td>
      <td className="py-2.5 pr-4 text-xs text-[#94a3b8]">{fmtCurrency(ad.spend, currency)}</td>
      <MetricCell value={fmtX(ad.roas)}  metric="roas" />
      <MetricCell value={fmtPct(ad.ctr)} metric="ctr"  />
      <MetricCell value={fmtCurrency(ad.cpa, currency)} metric="cpa" />
      <td className="py-2.5 pr-4 text-xs text-[#94a3b8]">{ad.conversions}</td>
    </tr>
  );
}

function AdSetRow({ adSet, currency }: { adSet: AdSetRow; currency?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="cursor-pointer border-b border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]"
        onClick={() => setOpen((p) => !p)}
      >
        <td className="py-2.5 pl-8 pr-4 text-xs">
          <span className="flex items-center gap-1.5 text-[#94a3b8]">
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span className={cn("font-mono text-[10px]", STATUS_COLORS[adSet.status] ?? "text-[#64748b]")}>
              {adSet.status}
            </span>{" "}
            {adSet.name}
          </span>
        </td>
        <td className="py-2.5 pr-4 text-xs text-[#94a3b8]">{fmtCurrency(adSet.spend, currency)}</td>
        <MetricCell value={fmtX(adSet.roas)}  metric="roas" />
        <MetricCell value={fmtPct(adSet.ctr)} metric="ctr"  />
        <MetricCell value={fmtCurrency(adSet.cpa, currency)} metric="cpa" />
        <td className="py-2.5 pr-4 text-xs text-[#94a3b8]">{adSet.conversions}</td>
      </tr>
      {open && adSet.ads.map((ad) => (
        <AdRow key={ad.id} ad={ad} currency={currency} />
      ))}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CampaignTable({ campaigns, currency }: Props) {
  const [openCampaigns, setOpenCampaigns] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenCampaigns((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const headers = [
    { label: "Nombre" },
    { label: "Gasto", metric: "spend" },
    { label: "ROAS",  metric: "roas" },
    { label: "CTR",   metric: "ctr" },
    { label: "CPA",   metric: "cpa" },
    { label: "Conversiones" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left">
            {headers.map((h) => (
              <th key={h.label} className="pb-3 pr-4 font-medium text-[#94a3b8]">
                {h.metric ? (
                  <MetricTooltip metric={h.metric}>{h.label}</MetricTooltip>
                ) : h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => {
            const isOpen = openCampaigns.has(campaign.id);
            return (
              <>
                <tr
                  key={campaign.id}
                  className="cursor-pointer border-b border-white/[0.06] hover:bg-white/[0.04]"
                  onClick={() => toggle(campaign.id)}
                >
                  <td className="py-3 pr-4 font-medium text-[#f1f5f9]">
                    <span className="flex items-center gap-2">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span className={cn("text-xs font-mono", STATUS_COLORS[campaign.status] ?? "text-[#64748b]")}>
                        {campaign.status}
                      </span>
                      {campaign.name}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-[#f1f5f9]">{fmtCurrency(campaign.spend, currency)}</td>
                  <MetricCell value={fmtX(campaign.roas)}  metric="roas" />
                  <MetricCell value={fmtPct(campaign.ctr)} metric="ctr"  />
                  <MetricCell value={fmtCurrency(campaign.cpa, currency)} metric="cpa" />
                  <td className="py-3 pr-4 text-[#f1f5f9]">{campaign.conversions}</td>
                </tr>
                {isOpen && campaign.adSets.map((adSet) => (
                  <AdSetRow key={adSet.id} adSet={adSet} currency={currency} />
                ))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
