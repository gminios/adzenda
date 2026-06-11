# AdZenda

Traductor de performance de Meta Ads a informes semanales narrativos para clientes del rubro textil/moda. Multi-tenant, admin-only, los clientes finales reciben los informes por email/WhatsApp y no acceden al panel.

> Para contexto de producto, convenciones y restricciones, ver [`CLAUDE.md`](./CLAUDE.md). Para PRDs y user stories, ver [`docs/`](./docs/).

---

## Stack

- **Next.js 15** (App Router, TypeScript strict)
- **PostgreSQL 16** + **Prisma 7**
- **NextAuth v5** (admin-only, credenciales)
- **Anthropic Claude** (Haiku 4.5 / Sonnet) para narrativas
- **AWS SES v2** para envío de email
- **node-cron** para ingesta diaria + generación + entrega
- **Tailwind 4** + **Framer Motion** + **Recharts**
- **Pino** para logs estructurados

---

## Requisitos

- Node.js 20+ (recomendado por compatibilidad con Next.js 15 y Prisma 7)
- PostgreSQL 16 corriendo localmente o accesible vía red
- Cuenta AWS SES verificada (sandbox alcanza para desarrollo)
- API key de Anthropic
- Token de System User de Meta Marketing API con permisos `ads_read` por cada cuenta a sincronizar

---

## Setup local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copiá `.env.example` a `.env` y completá los valores (ver sección **Variables de entorno** más abajo).

```bash
cp .env.example .env
```

### 3. Generar Prisma client + correr migraciones

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Seed del usuario admin

```bash
ADMIN_PASSWORD=tu_password npx prisma db seed
```

Esto crea el usuario admin con el email definido en `ADMIN_EMAIL` y la contraseña pasada por env.

### 5. Levantar el dev server

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) e ingresá con las credenciales del seed.

> **Nota sobre cron jobs en desarrollo:** los jobs se inicializan al arrancar el proceso vía `src/instrumentation.ts`. En `next dev` con HMR pueden re-instanciarse al recompilar, lo cual es esperable. Para probar un job sin esperar al horario, ejecutalo manualmente desde una API route protegida o un script ad-hoc.

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev server con HMR (puerto 3000) |
| `npm run build` | Build de producción |
| `npm run start` | Server de producción (después de `build`) |
| `npm run lint` | ESLint sobre `src/` |
| `npx prisma migrate dev` | Aplicar migraciones en dev |
| `npx prisma migrate deploy` | Aplicar migraciones en producción |
| `npx prisma studio` | UI para inspeccionar la base |
| `npx prisma db seed` | Crear/actualizar usuario admin |

---

## Variables de entorno

Todas viven en `.env` en la raíz. `.env.example` tiene el template.

### Admin (obligatorias)

```bash
ADMIN_EMAIL="admin@adzenda.com"   # también recibe alertas de tokens expirados
ADMIN_PASSWORD=""                  # sólo se usa al correr el seed
```

`ADMIN_EMAIL` admite múltiples destinatarios separados por coma (ej: `admin@x.com, ops@x.com`).

### Base de datos (obligatoria)

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/adzenda"
```

### NextAuth (obligatorias)

```bash
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"   # URL pública en producción
AUTH_SECRET="<openssl rand -base64 32>"
```

### Encriptación de tokens de Meta (obligatoria)

```bash
META_TOKEN_ENCRYPTION_KEY="<64 hex chars = 32 bytes>"
# Generar con:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Importante:** si esta clave cambia, los tokens guardados quedan inservibles. Conservala segura.

### Anthropic (obligatoria para generación de informes)

```bash
ANTHROPIC_API_KEY="sk-ant-..."
```

### AWS SES (obligatoria para envío de informes y alertas)

```bash
AWS_SES_REGION="us-east-1"
AWS_SES_FROM_EMAIL="noreply@tudominio.com"   # debe estar verificado en SES
```

Credenciales AWS: el SDK toma `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` del entorno, perfil de `~/.aws/credentials`, o IAM role si corre en EC2.

### WhatsApp (opcional, todavía no integrado)

```bash
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_ACCESS_TOKEN=""
```

> El canal de WhatsApp aún no está implementado. Ver [`docs/canales-de-entrega.md`](./docs/canales-de-entrega.md) para el análisis de alternativas (Telegram, Evolution API self-hosted, Twilio/YCloud).

---

## Cron jobs

Los jobs corren dentro del mismo proceso Next.js vía `node-cron`. Se inicializan en `src/instrumentation.ts` y se schedulean en `src/jobs/index.ts`. Zona horaria: **UTC-3** (Montevideo/Buenos Aires).

| Horario | Job | Archivo |
|---------|-----|---------|
| **03:00 diario** | Ingesta de insights de Meta (últimos 3 días por cuenta activa) | `src/jobs/ingestion.ts` |
| **03:30 diario** | Evaluación de alertas críticas | _todavía no habilitado_ |
| **06:00 lunes** | Generación de informe semanal por tenant activo | `src/jobs/report-generation.ts` |
| **08:00 lunes** | Entrega de informes (email + PDF) | `src/jobs/delivery.ts` |

Los errores por cuenta se loguean y la ingesta continúa con las siguientes. Si una cuenta devuelve error 190/102 (token expirado), se marca como `EXPIRED` y se envía un email al admin (sólo una vez, en la transición VALID → EXPIRED).

---

## Estructura del proyecto

```
adzenda/
├── prisma/
│   ├── schema.prisma          # Modelos: Tenant, AdAccount, Campaign, AdSet, Ad,
│   │                          # DailyInsight, BenchmarkThreshold, Report,
│   │                          # DeliveryConfig, DeliveryLog, SyncLog, User
│   ├── migrations/
│   └── seed.ts                # Usuario admin
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # Login
│   │   ├── (dashboard)/       # Panel admin (requiere sesión)
│   │   │   ├── page.tsx       # KPIs semanales
│   │   │   ├── campaigns/     # Tabla expandible campañas → adsets → ads
│   │   │   ├── trends/        # Gráficos 12 semanas
│   │   │   ├── reports/       # Lista, detalle, edición, envío
│   │   │   └── settings/      # Clientes, cuentas, thresholds, entrega
│   │   └── api/               # Auth, PDF de informes
│   ├── components/            # ui/, dashboard/, reports/, charts/
│   ├── lib/
│   │   ├── meta/              # Cliente API + rate limiter + hierarchy + insights
│   │   ├── ai/                # Cliente Anthropic + prompts + report-generator
│   │   ├── delivery/          # email.ts, pdf.tsx
│   │   ├── alerts/            # token-expired.ts
│   │   ├── actions/           # Server Actions (mutaciones)
│   │   ├── schemas/           # Zod schemas
│   │   ├── benchmarks.ts      # Thresholds + semáforos
│   │   ├── metrics.ts         # Aggregations
│   │   └── periods.ts         # Selector de período
│   ├── jobs/                  # Cron jobs
│   ├── stores/                # Zustand (UI state)
│   ├── hooks/
│   └── types/
└── docs/
    ├── AdZenda_PRD_v1.docx
    ├── canales-de-entrega.md
    └── evolution-api-setup.md
```

---

## Flujo típico de uso

1. **Crear un tenant** desde `Configuración → Clientes`.
2. **Conectar una cuenta de Meta** dentro del tenant pegando el System User Token con permisos `ads_read`.
3. Esperar la próxima ingesta (03:00) o forzarla manualmente desde el botón ⟳ junto a la cuenta.
4. Una vez que hay al menos 1 semana de datos, el dashboard muestra KPIs con semáforos verde/amarillo/rojo.
5. **Configurar entrega** en `Configuración → Entrega`: lista de emails destinatarios + activar el canal email.
6. El lunes a las 06:00 se genera el informe; a las 08:00 se envía automáticamente. También se puede regenerar y/o enviar manualmente desde la página del informe.

---

## Deploy a producción

El despliegue de referencia es **PM2 sobre EC2** (mismo patrón que el resto del stack del equipo). Pasos resumidos:

1. Servidor con Node 20+, PostgreSQL 16, certificado HTTPS (Caddy/Nginx).
2. Clonar el repo, `npm ci`, `npm run build`.
3. Configurar `.env` con las URLs/secretos de producción.
4. `npx prisma migrate deploy` para aplicar migraciones.
5. `ADMIN_PASSWORD=... npx prisma db seed` para crear el admin (una sola vez).
6. Levantar con PM2: `pm2 start npm --name adzenda -- start`.
7. `pm2 save && pm2 startup` para que reinicie al bootear.

No hace falta un worker process separado: los cron jobs corren dentro del proceso Next.js.

---

## Documentación adicional

- [`CLAUDE.md`](./CLAUDE.md) — Convenciones del proyecto, do/don'ts, decisiones técnicas.
- [`TASK.md`](./TASK.md) — Estado de PRDs y user stories.
- [`docs/AdZenda_PRD_v1.docx`](./docs/AdZenda_PRD_v1.docx) — PRDs completos.
- [`docs/canales-de-entrega.md`](./docs/canales-de-entrega.md) — Análisis comparativo de canales (WhatsApp, Telegram, Email, etc).
- [`docs/evolution-api-setup.md`](./docs/evolution-api-setup.md) — Guía de setup de Evolution API si se opta por WhatsApp self-hosted.
