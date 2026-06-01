# DESIGN_SYSTEM.md — AdClarity

## Overview

AdClarity uses a **glassmorphism** design language: semi-transparent surfaces with backdrop blur over a deep gradient background. This creates a premium, modern feel that differentiates from generic dashboards while making semaphore colors (green/yellow/red) pop visually.

**All UI text must be in Spanish (Latin American).**

---

## Core Visual Principles

1. **Glass cards** as the primary container — semi-transparent backgrounds with backdrop blur
2. **Vibrant gradients** for accents — headers, CTAs, active states, semaphore badges
3. **Smooth entry animations** on every view transition and card mount
4. **Dark palette** — the glass effect works on a deep gradient background
5. **Generous whitespace** and large typography for scannability
6. **Mobile-first delivery** — reports must be readable in 30 seconds on a phone

---

## Color Tokens (globals.css)

```css
@theme {
  /* Page background gradient */
  --color-bg-start: #0f0b1e;
  --color-bg-mid: #1a1333;
  --color-bg-end: #0d1b2a;

  /* Glass surfaces */
  --color-glass: rgba(255, 255, 255, 0.06);
  --color-glass-hover: rgba(255, 255, 255, 0.10);
  --color-glass-border: rgba(255, 255, 255, 0.12);
  --color-glass-strong: rgba(255, 255, 255, 0.15);

  /* Text hierarchy */
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;

  /* Accent gradients */
  --gradient-primary: linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa);
  --gradient-success: linear-gradient(135deg, #059669, #34d399);
  --gradient-warning: linear-gradient(135deg, #d97706, #fbbf24);
  --gradient-danger: linear-gradient(135deg, #dc2626, #f87171);

  /* Semaphore (high contrast against dark bg) */
  --color-semaphore-green: #34d399;
  --color-semaphore-yellow: #fbbf24;
  --color-semaphore-red: #f87171;

  /* Shadows & glows */
  --shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.3);
  --shadow-glow-primary: 0 0 20px rgba(99, 102, 241, 0.3);
  --shadow-glow-success: 0 0 20px rgba(52, 211, 153, 0.3);
}
```

---

## Dashboard Background

The entire dashboard sits on a gradient with subtle animated orbs for depth:

```tsx
// app/(dashboard)/layout.tsx
<div className="min-h-screen bg-gradient-to-br from-[#0f0b1e] via-[#1a1333] to-[#0d1b2a]">
  {/* Ambient glow orbs (purely decorative) */}
  <div className="pointer-events-none fixed inset-0 overflow-hidden">
    <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-indigo-500/20 blur-[100px]" />
    <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-purple-500/15 blur-[120px]" />
    <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />
  </div>
  <div className="relative z-10">{children}</div>
</div>
```

---

## Component Patterns

### GlassCard (primary container)

Every section, widget, and card uses this base:

```tsx
// components/ui/glass-card.tsx
"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}

export function GlassCard({ children, className, hover = true, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.06] p-6",
        "backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        hover && "transition-all duration-300 hover:bg-white/[0.10] hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
```

### Semaphore Badge

```tsx
// components/ui/semaphore-badge.tsx
const colorMap = {
  green:  "from-emerald-500 to-green-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]",
  yellow: "from-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]",
  red:    "from-red-500 to-rose-400 shadow-[0_0_12px_rgba(248,113,113,0.4)]",
};

// Renders as a pill with gradient background and soft glow
// Usage: <SemaphoreBadge color="green" label="ROAS saludable" />
```

### Metric Tooltip (Jargon Translator)

Every metric label wraps in `<MetricTooltip>`:

```tsx
// Usage: <MetricTooltip metric="ctr">CTR</MetricTooltip>
```

Tooltip dictionary — written for non-technical business owners:

```typescript
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
```

---

## Animation Conventions (Framer Motion)

### Standard Presets

```tsx
// Entry animation for cards and sections
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" },
};

// Stagger children (card grids, lists)
const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
};

// Interactive hover (Action Cards, buttons)
const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

// Page transitions
const pageTransition = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
  transition: { duration: 0.3 },
};
```

### Rules

- Every card/section that mounts gets `fadeInUp` with staggered delay
- Page changes use `pageTransition`
- Interactive elements get `hoverScale`
- **Never exceed 0.6s duration** — feels sluggish beyond that
- Use `layout` prop for elements that change position (reordering, filtering)
- Respect `prefers-reduced-motion` — disable animations when set
- Number count-ups for KPI values use `useMotionValue` + `useTransform`

---

## Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title | text-2xl (24px) | bold | text-primary |
| Section title | text-lg (18px) | semibold | text-primary |
| KPI value | text-3xl (30px) | bold | text-primary |
| KPI label | text-sm (14px) | medium | text-secondary |
| Body text | text-sm (14px) | normal | text-secondary |
| Badge / tag | text-xs (12px) | semibold | varies |

Font stack: system-ui (Tailwind default). No custom fonts needed — keeps load fast.

---

## Layout Conventions

- **Sidebar:** Fixed left, glass surface, 240px wide. Collapsible on mobile.
- **Header:** Sticky top, glass surface. Contains tenant selector (dropdown) + user menu.
- **Content area:** Max-width 1280px, centered, with `px-6 py-8` padding.
- **Card grids:** `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6` for KPI cards.
- **Tables:** Glass card wrapper, alternating row opacity (`even:bg-white/[0.03]`).

---

## Charts

Use Recharts with glassmorphism theme:

```tsx
// Transparent chart background (inherits glass card)
// Grid lines: stroke="rgba(255,255,255,0.06)"
// Axis text: fill="#94a3b8" (text-secondary)
// Line/bar colors: use gradient-primary, gradient-success, etc.
// Tooltip: glass card style (bg-white/10, backdrop-blur, border-white/10)
// No chart borders — let the glass card provide the frame
```

---

## Semaphore Thresholds (Fashion/Textile Defaults)

| Metric | 🟢 Green | 🟡 Yellow | 🔴 Red |
|--------|----------|-----------|--------|
| ROAS | > 3.0x | 1.5x – 3.0x | < 1.5x |
| CTR | > 1.2% | 0.6% – 1.2% | < 0.6% |
| CPC | < $0.50 | $0.50 – $1.20 | > $1.20 |
| CPM | < $8.00 | $8.00 – $18.00 | > $18.00 |
| Frequency | < 3.0 | 3.0 – 5.0 | > 5.0 |
| CPA | < $15.00 | $15.00 – $35.00 | > $35.00 |

These are configurable per tenant in `settings/thresholds`. Values above are sensible defaults for the Latin American textile/fashion market.

---

## Action Cards Design

Each report generates exactly 3 action cards:

```
┌─────────────────────────────────────────┐
│ 🎯  Redistribuir presupuesto     [Alta] │
│                                         │
│ Mové $10 diarios de la campaña          │
│ "Chaquetas" a "Vestidos de Verano"      │
│ porque está vendiendo a mitad de costo. │
│                                         │
│ Categoría: Presupuesto                  │
└─────────────────────────────────────────┘
```

- Glass card with left gradient border indicating priority (green/yellow/red)
- Icon per category: 💰 budget, 🎨 creative, 👥 audience, ⚡ general
- `hoverScale` animation on interaction
- Priority badge (semaphore) top-right

---

## Report Story Image (WhatsApp)

Vertical format: **1080 x 1920px**. Designed to be read in 30 seconds.

```
┌──────────────────────┐
│     AdClarity 📊     │  ← Brand header
│   Semana 14-20 Abr   │
├──────────────────────┤
│                      │
│   Gasto: $1,200      │  ← Top KPIs with semaphores
│   ROAS: 3.8x  🟢    │
│   Ventas: 42   🟢    │
│   CPA: $28     🟡    │
│                      │
├──────────────────────┤
│                      │
│ 🏆 Mejor: Vestidos   │  ← Highlights
│ ⚠️ Peor: Chaquetas   │
│                      │
├──────────────────────┤
│                      │
│ 1. Mové presupuesto  │  ← Top 3 actions (short)
│ 2. Cambiá la foto    │
│ 3. Probá mujeres 35+ │
│                      │
└──────────────────────┘
```

Dark gradient background, glass sections, large text. Generated server-side with Puppeteer or Satori.
