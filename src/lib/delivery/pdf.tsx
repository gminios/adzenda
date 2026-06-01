import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { ActionCard } from "@/lib/ai/report-generator";

const COLORS = {
  bg:        "#0f0b1e",
  surface:   "#1a1333",
  border:    "#2d2450",
  primary:   "#a78bfa",
  textMain:  "#f1f5f9",
  textSub:   "#94a3b8",
  textMuted: "#64748b",
  green:     "#34d399",
  yellow:    "#fbbf24",
  red:       "#f87171",
};

const PRIORITY_COLOR: Record<string, string> = {
  alta:  COLORS.red,
  media: COLORS.yellow,
  baja:  COLORS.green,
};

const PRIORITY_LABEL: Record<string, string> = {
  alta: "Alta", media: "Media", baja: "Baja",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 40,
    paddingVertical: 48,
    fontFamily: "Helvetica",
    color: COLORS.textMain,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  brand: {
    fontSize: 10,
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMain,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textSub,
  },
  sectionLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 20,
  },
  narrative: {
    fontSize: 11,
    lineHeight: 1.8,
    color: "#cbd5e1",
  },
  paragraph: {
    marginBottom: 10,
  },
  cardsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  card: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMain,
    flex: 1,
    marginRight: 6,
  },
  priorityBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardDescription: {
    fontSize: 9,
    color: COLORS.textSub,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  actionBox: {
    backgroundColor: "#0f0b1e",
    borderRadius: 4,
    padding: 6,
  },
  actionLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  actionText: {
    fontSize: 9,
    color: COLORS.textMain,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.textMuted,
  },
});

interface Props {
  tenantName: string;
  periodStart: Date;
  periodEnd: Date;
  narrative: string;
  actionCards: ActionCard[];
}

function fmt(d: Date) {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

function ReportDocument({ tenantName, periodStart, periodEnd, narrative, actionCards }: Props) {
  const paragraphs = narrative.split(/\n\n+/).filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>AdZenda · Informe de publicidad</Text>
          <Text style={styles.title}>{tenantName}</Text>
          <Text style={styles.subtitle}>
            {fmt(periodStart)} – {fmt(periodEnd)}
          </Text>
        </View>

        {/* Narrative */}
        <Text style={styles.sectionLabel}>Resumen ejecutivo</Text>
        <View>
          {paragraphs.map((p, i) => (
            <Text key={i} style={[styles.narrative, styles.paragraph]}>{p}</Text>
          ))}
        </View>

        {/* Action Cards */}
        {actionCards.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Recomendaciones</Text>
            <View style={styles.cardsGrid}>
              {actionCards.map((card, i) => (
                <View key={i} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text
                      style={[
                        styles.priorityBadge,
                        { color: PRIORITY_COLOR[card.priority] ?? COLORS.textSub },
                      ]}
                    >
                      {PRIORITY_LABEL[card.priority] ?? card.priority}
                    </Text>
                  </View>
                  <Text style={styles.cardDescription}>{card.description}</Text>
                  <View style={styles.actionBox}>
                    <Text style={styles.actionLabel}>Acción:</Text>
                    <Text style={styles.actionText}>{card.action}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AdZenda — Informe confidencial</Text>
          <Text style={styles.footerText}>
            Generado el{" "}
            {new Date().toLocaleDateString("es-AR")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateReportPdf(props: Props): Promise<Buffer> {
  const buffer = await renderToBuffer(<ReportDocument {...props} />);
  return Buffer.from(buffer);
}
