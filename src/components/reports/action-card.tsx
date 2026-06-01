import { DollarSign, Palette, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionCard as ActionCardType } from "@/lib/ai/report-generator";

const CATEGORY_ICON = {
  presupuesto: DollarSign,
  creativo:    Palette,
  audiencia:   Users,
  general:     Zap,
};

const PRIORITY_STYLES = {
  alta:  "border-l-[#f87171] from-red-500/10",
  media: "border-l-[#fbbf24] from-amber-500/10",
  baja:  "border-l-[#34d399] from-emerald-500/10",
};

const PRIORITY_BADGE = {
  alta:  "bg-red-500/20 text-[#f87171]",
  media: "bg-amber-500/20 text-[#fbbf24]",
  baja:  "bg-emerald-500/20 text-[#34d399]",
};

const PRIORITY_LABEL = {
  alta:  "Alta",
  media: "Media",
  baja:  "Baja",
};

interface Props {
  card: ActionCardType;
  index: number;
}

export function ActionCard({ card, index }: Props) {
  const Icon = CATEGORY_ICON[card.category] ?? Zap;

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 border-l-2 bg-gradient-to-br to-transparent p-5",
        "backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)]",
        PRIORITY_STYLES[card.priority]
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
            <Icon size={15} className="text-[#94a3b8]" />
          </div>
          <h3 className="font-semibold text-[#f1f5f9]">{card.title}</h3>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            PRIORITY_BADGE[card.priority]
          )}
        >
          {PRIORITY_LABEL[card.priority]}
        </span>
      </div>

      <p className="mb-3 text-sm leading-relaxed text-[#94a3b8]">{card.description}</p>

      <div className="rounded-lg bg-white/[0.04] px-3 py-2">
        <p className="text-xs font-medium text-[#f1f5f9]">
          <span className="text-[#64748b]">Acción: </span>
          {card.action}
        </p>
      </div>
    </div>
  );
}
