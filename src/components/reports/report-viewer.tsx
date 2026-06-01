import { GlassCard } from "@/components/ui/glass-card";
import { ActionCard } from "@/components/reports/action-card";
import type { ActionCard as ActionCardType } from "@/lib/ai/report-generator";

interface Props {
  narrative: string;
  actionCards: ActionCardType[];
}

export function ReportViewer({ narrative, actionCards }: Props) {
  const paragraphs = narrative.split(/\n\n+/).filter(Boolean);

  return (
    <div className="space-y-8">
      {/* Narrative */}
      <GlassCard hover={false}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#64748b]">
          Resumen ejecutivo
        </h2>
        <div className="space-y-4">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-7 text-[#cbd5e1]">
              {p}
            </p>
          ))}
        </div>
      </GlassCard>

      {/* Action Cards */}
      {actionCards.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#64748b]">
            Recomendaciones
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {actionCards.map((card, i) => (
              <ActionCard key={i} card={card} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
