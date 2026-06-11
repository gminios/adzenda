# TASK.md — AdClarity

## Current Sprint: Fase 1 — Fundaciones

### PRD-01: Infraestructura Multi-Tenant
- [x] Definir schema Prisma (tenants, ad_accounts, users) — `prisma/schema.prisma`
- [x] Configurar NextAuth.js (admin-only) — `src/lib/auth.ts`, `src/middleware.ts`
- [x] CRUD de tenants — `settings/tenants/` (lista, crear, editar, activar/desactivar)
- [x] Registro de cuentas publicitarias con token encriptado — `settings/tenants/[id]/accounts/`
- [x] Dashboard admin con lista de tenants — stats cards + estado de conexión Meta + última sync

### PRD-02: Ingesta de Meta Marketing API
- [x] Cliente Meta API con rate limiter — `lib/meta/rate-limiter.ts` (backoff 1s→2s→4s)
- [x] Setup node-cron jobs — `src/jobs/index.ts` + `instrumentation.ts`
- [x] Job de ingesta diaria — `src/jobs/ingestion.ts` (03:00 UTC-3)
- [x] Sync de jerarquía campaign → adset → ad — `lib/meta/hierarchy.ts`
- [x] Detección de tokens expirados — error 190/102 → tokenStatus=EXPIRED
- [x] (2026-06-11) US-10: re-sincronización manual por cuenta desde el panel — `lib/actions/ingestion.ts` (`triggerAccountSync` con `triggeredBy=manual`, mapeo de errores Meta a español) + `components/dashboard/sync-button.tsx` (estados idle/loading/success/error con feedback visual)
- [x] (2026-06-11) US-11: alerta por email al admin cuando un token de Meta se marca como expirado — `lib/alerts/token-expired.ts` (notifica una vez en la transición VALID→EXPIRED) + `lib/delivery/email.ts` (`sendAdminAlertEmail`); integrado en cron de ingesta y sync manual. Destinatarios desde `ADMIN_EMAIL` (admite varios separados por coma)

### PRD-03: Panel de Visualización + Semáforos
- [x] Schema BenchmarkThreshold + migración — `prisma/schema.prisma`
- [x] lib/benchmarks.ts — thresholds defaults fashion/textil + getSemaphore()
- [x] lib/metrics.ts — aggregateInsights() + pctChange()
- [x] lib/active-tenant.ts — resolveActiveTenant() + cookie helpers
- [x] SemaphoreBadge component — `components/ui/semaphore-badge.tsx`
- [x] MetricTooltip component — `components/ui/metric-tooltip.tsx` (glosario en español)
- [x] KpiCard component — `components/dashboard/kpi-card.tsx` (% cambio + semáforo)
- [x] TenantSelector component — `components/dashboard/tenant-selector.tsx` (cookie-based)
- [x] Header con TenantSelector — `app/(dashboard)/layout.tsx`
- [x] Sidebar actualizado con nav completo — `components/dashboard/sidebar.tsx`
- [x] Dashboard page — `app/(dashboard)/page.tsx` (KPIs semanales, US-12)
- [x] Campaigns page — `app/(dashboard)/campaigns/page.tsx` (tabla expandible, US-14)
- [x] Campaign table component — `components/dashboard/campaign-table.tsx`
- [x] Trends page — `app/(dashboard)/trends/page.tsx` (Recharts 12 semanas, US-15)
- [x] TrendChart component — `components/charts/trend-chart.tsx`
- [x] Thresholds settings page — `app/(dashboard)/settings/thresholds/page.tsx` (US-13)
- [x] ThresholdForm component — `components/dashboard/threshold-form.tsx`
- [x] lib/actions/thresholds.ts — upsertThreshold + resetThreshold

### PRD-04: Generación de Informes con IA
- [x] Schema Report + campo reportTone en Tenant — `prisma/schema.prisma`
- [x] lib/ai/client.ts — Anthropic SDK singleton
- [x] lib/ai/prompts.ts — system prompt + buildUserPrompt() (moda/textil, español llano)
- [x] lib/ai/report-generator.ts — generateReportForTenant() con contexto completo
- [x] lib/actions/reports.ts — generateReport, updateReportNarrative, markReportReady
- [x] jobs/report-generation.ts — runReportGeneration() semanal
- [x] jobs/index.ts — cron lunes 06:00 para generación automática
- [x] ActionCard component — `components/reports/action-card.tsx`
- [x] ReportViewer component — `components/reports/report-viewer.tsx`
- [x] GenerateButton component — `components/reports/generate-button.tsx` (con loading)
- [x] ReportEditor component — `components/reports/report-editor.tsx` (textarea + save)
- [x] Reports list page — `app/(dashboard)/reports/page.tsx`
- [x] Report detail page — `app/(dashboard)/reports/[id]/page.tsx`
- [x] Report edit page — `app/(dashboard)/reports/[id]/edit/page.tsx`
- [x] Sidebar: Informes habilitado

### PRD-05: Entrega de Informes (Email + PDF)
- [x] Schema DeliveryConfig + DeliveryLog + relaciones — `prisma/schema.prisma`
- [x] lib/delivery/pdf.tsx — PDF con @react-pdf/renderer (narrativa + action cards + branding)
- [x] lib/delivery/email.ts — envío HTML via AWS SES v2
- [x] lib/actions/delivery.ts — upsertDeliveryConfig + sendReportManually
- [x] jobs/delivery.ts — runDelivery() semanal (lunes 08:00)
- [x] jobs/index.ts — cron entrega automática habilitado
- [x] API route PDF — `app/api/reports/[id]/pdf/route.ts` (descarga directa)
- [x] SendForm component — `components/reports/send-form.tsx`
- [x] DeliveryConfigForm component — `components/dashboard/delivery-config-form.tsx`
- [x] Settings/delivery page — `app/(dashboard)/settings/delivery/page.tsx`
- [x] Report detail page — botón PDF + sección envío + historial de entregas
- [x] Sidebar — link a Entrega en Configuración

## Discovered During Work
- [x] (2026-05-11) Banner global de token expirado/inválido en el dashboard layout, visible para todas las páginas cuando el tenant activo tiene cuentas con tokenStatus ≠ VALID — `components/dashboard/token-status-banner.tsx` + `app/(dashboard)/layout.tsx`