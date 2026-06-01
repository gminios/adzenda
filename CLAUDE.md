# CLAUDE.md — AdClarity

## What is this project?

AdClarity is a multi-tenant Meta Ads performance translator for small business clients (textile/fashion). It ingests data from Meta Marketing API, stores it in PostgreSQL, and uses Claude AI to generate weekly narrative reports with actionable recommendations in plain Spanish. Clients receive reports via email and WhatsApp — they never access the dashboard. The admin panel is for the consultant/agency.

**This is NOT a metrics dashboard. It's a business translator.** Every decision should prioritize clarity for non-technical business owners over data completeness.

**UI language: Spanish (Latin American).** All labels, tooltips, messages, placeholders, and copy in the interface must be in Spanish.

---

## Workflow
### PRDs
- PRDs are located inside /docs/AdZenda_PRD_v1.docx

### Project Awareness

- **Check `TASK.md` before starting any task.** If the task isn't listed, add it with a brief description and today's date.
- **Mark completed tasks in `TASK.md`** immediately after finishing them.
- Add new sub-tasks or TODOs discovered during development to `TASK.md` under a "Discovered During Work" section.

### Development Philosophy

- **KISS (Keep It Simple, Stupid).** Choose straightforward solutions over complex ones whenever possible.
- **YAGNI (You Aren't Gonna Need It).** Implement features only when they are needed, not when you anticipate they might be useful.

### File & Function Limits

- **Files:** never exceed 500 lines. If approaching this limit, refactor into modules.
- **Functions:** under 90 lines, single clear responsibility.
- **Classes:** under 250 lines, single concept or entity.
- **Organize code into clearly separated modules**, grouped by feature or responsibility.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), TypeScript strict |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion |
| State | Zustand (UI state only) |
| ORM / DB | Prisma + PostgreSQL 16 |
| Jobs | node-cron |
| AI | Anthropic Claude API (Haiku 4.5 / Sonnet) |
| Email | AWS SES |
| WhatsApp | Meta WhatsApp Cloud API |
| Auth | NextAuth.js v5 (admin-only) |
| Process | PM2 (web + worker) |
| Logging | Pino (structured JSON) |

---

## Project Structure

```
adclarity/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout with providers
│   │   ├── globals.css               # Tailwind base + design tokens
│   │   ├── (auth)/login/page.tsx
│   │   └── (dashboard)/
│   │       ├── layout.tsx            # Shell: sidebar + header + tenant selector
│   │       ├── page.tsx              # Weekly summary (default)
│   │       ├── campaigns/            # Campaign list + detail
│   │       ├── reports/              # Report history, view, edit, send
│   │       ├── trends/page.tsx       # 8-12 week trend charts
│   │       ├── alerts/page.tsx       # Alert rules + log
│   │       └── settings/             # Tenants, accounts, delivery, thresholds
│   ├── components/
│   │   ├── ui/                       # Primitives (GlassCard, Badge, Tooltip, etc.)
│   │   ├── dashboard/                # Composed dashboard components
│   │   ├── reports/                  # Report viewer, editor, action cards
│   │   └── charts/                   # Chart wrappers
│   ├── lib/
│   │   ├── db.ts                     # Prisma client singleton
│   │   ├── auth.ts                   # NextAuth config
│   │   ├── meta/                     # Meta API: client, insights, campaigns, rate-limiter
│   │   ├── ai/                       # Claude: client, prompts, report-generator
│   │   ├── delivery/                 # Email, WhatsApp, PDF, story-image generators
│   │   ├── benchmarks.ts             # Thresholds + semaphore logic
│   │   └── utils.ts                  # Formatting, dates, currency
│   ├── stores/                       # Zustand: tenant-store, filter-store, ui-store
│   ├── hooks/                        # use-metrics, use-tenant, use-semaphore
│   ├── types/                        # meta.ts, metrics.ts, reports.ts, tenants.ts
│   └── jobs/                         # node-cron: ingestion, report-generation, delivery, alerts
├── docs/
│   └── DESIGN_SYSTEM.md             # Visual design guidelines (see below)
├── .env.example
├── pm2.ecosystem.config.js
├── CLAUDE.md                         # This file
└── package.json
```

---

## Key Conventions

### Multi-Tenant

- Every data table has a mandatory `tenantId` FK
- Every query MUST filter by `tenantId` — no exceptions
- Tokens encrypted at rest (AES-256-GCM), key in env var

### Database (Prisma)

- Tables: PascalCase singular (`Campaign`, `DailyInsight`)
- Columns: camelCase (`tenantId`, `conversionValue`)
- Every table has `createdAt` + `updatedAt`
- Enums: UPPER_SNAKE_CASE (`ACTIVE`, `PAUSED`)

### Code Style

- TypeScript strict, no `any`
- Server Components by default; `"use client"` only for interactivity
- Named exports (except page.tsx)
- File naming: kebab-case; component naming: PascalCase
- One component per file
- `cn()` (clsx + tailwind-merge) for conditional classes

### Zustand

- UI state only (active tenant, sidebar, filters, modals)
- Server data (metrics, reports) → React Query, NOT Zustand
- Always use `devtools` middleware; `persist` only for tenant selection

### Meta Marketing API

- Base: `https://graph.facebook.com/v21.0`
- Rate limit: token bucket, exponential backoff on 429 (1s → 2s → 4s, max 3)
- Re-ingest last 3 days each run (attribution settles in ~72h)
- Show "provisional" badge on data < 3 days old
- Weekly reports use previous Mon-Sun (fully settled data)

### AI Reports

- Context goes IN the prompt (metrics JSON), Claude never fetches data
- Include previous week for comparison + benchmark thresholds
- Output: narrative (3-4 paragraphs) + 3 action cards (JSON)
- Tone: trusted consultant, Latin American Spanish, no jargon
- Never mention Claude, AI, or that the report is automated
- Haiku 4.5 for weekly summaries, Sonnet for deep analysis

### Workers (PM2)

```
web → next start (port 3000)

Jobs run inside the Next.js process via node-cron.
No separate worker process needed for 3-4 clients.

Schedule (UTC-3):
  03:00 daily   → Ingestion (all active accounts)
  03:30 daily   → Alert evaluation
  06:00 Monday  → Report generation
  08:00 Monday  → Report delivery
```

### API Routes

- All under `src/app/api/`, admin session required
- Response: `{ data: T }` or `{ error: string, code: string }`
- Tenant scoping via header or query param

### Error Handling

- Workers: try/catch per account, log + continue, never crash
- Meta API: handle 429 (rate limit), 190 (token expired), 17 (rate limit variant)
- AI: handle refusals, malformed JSON, 30s timeout
- Server Actions return `{ success, data/error }` — never throw
- Error boundaries at route level for unexpected errors
- User-facing messages in Spanish; detailed errors to logger only

---

## Patterns

### Data Fetching

- **Server Components** fetch data directly using Prisma (preferred for initial page loads)
- **Client Components** use React Query with hooks for interactive/dynamic data
- Server Actions handle all mutations
- React Query query keys defined in `lib/query-keys.ts`

### Forms

- React Hook Form + Zod for client-side validation
- Zod schemas live in `lib/schemas/`; derive TypeScript types from them
- Server Actions re-validate with the same Zod schema server-side
- Validation messages in Spanish

### State Management

- **Server state:** Server Components + React Query (never Zustand)
- **UI state:** Local `useState` first. Lift to Zustand only if 3+ components need it
- **URL state:** Use `nuqs` or Next.js `searchParams` for filters, pagination
- **Auth state:** NextAuth.js — `auth()` server-side, `useSession()` client-side

### Auth & Permissions

- All routes require admin session (middleware level)
- Server Actions always verify session before executing
- Client-side checks are for UX only — never trust them

---

## Don'ts

- **No `useEffect` for data fetching** — use React Query or Server Components
- **No `enum`** — use `as const` objects or union types
- **No default exports** except Next.js pages/layouts (framework requirement)
- **No CSS modules or styled-components** — Tailwind only
- **No `console.log` in production** — use Pino logger or remove before commit
- **No relative imports crossing feature boundaries** — use `@/` aliases
- **No installing new dependencies without discussion** — check if existing tools cover the use case
- **No raw SQL** — use Prisma for all database operations
- **No DB access from Client Components** — all DB ops through Server Actions or Server Components

---

## Design System

**When working on any frontend component, page, or UI task, read `docs/DESIGN_SYSTEM.md` first.** It contains the glassmorphism theme, color tokens, animation patterns, component references, and semaphore/tooltip conventions.

---

## Environment Variables

```bash
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
META_TOKEN_ENCRYPTION_KEY=
ANTHROPIC_API_KEY=
AWS_SES_REGION=
AWS_SES_FROM_EMAIL=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
```

---

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Node over Python | Next.js full-stack | Single language, single deploy |
| node-cron over BullMQ/n8n | Simplest tool | 3-4 clients don't justify Redis infrastructure |
| Claude over Gemini | Anthropic API | Already in use, strong Spanish support |
| System User Token over OAuth | Direct token | 2-5 clients don't justify Meta App Review |
| Admin-only panel | Clients get reports | Reduces scope; clients don't need a login |
