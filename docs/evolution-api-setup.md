# Configuración de Evolution API para AdZenda

Guía de setup completa de Evolution API como canal de envío de informes por WhatsApp, sin depender de Meta directamente.

> Ver `canales-de-entrega.md` para el análisis de por qué Evolution API es una opción razonable para este caso de uso (3-5 clientes uruguayos, 1 informe semanal, contenido transaccional).

---

## Requisitos previos

- **Un VPS** con Docker + Docker Compose. Specs mínimas: 1 vCPU, 1 GB RAM, 20 GB disco. Sirve cualquier droplet de USD 5/mes (DigitalOcean, Hetzner, Vultr).
- **Un dominio o subdominio** apuntando al VPS (opcional pero recomendado, así corre con HTTPS detrás de un reverse proxy).
- **Un número de teléfono uruguayo dedicado** con WhatsApp activo (no Business, el común — se va a "mover" a la sesión multidevice escaneando QR).

---

## 1. Docker Compose

Evolution API necesita 3 servicios: la app, una base (PostgreSQL o MongoDB) y Redis para cache de sesión.

```yaml
# docker-compose.yml
version: "3.9"

services:
  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution_api
    restart: unless-stopped
    ports:
      - "8080:8080"
    env_file:
      - .env
    volumes:
      - evolution_instances:/evolution/instances
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    container_name: evolution_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: <password-fuerte>
      POSTGRES_DB: evolution
    volumes:
      - evolution_postgres:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: evolution_redis
    restart: unless-stopped
    volumes:
      - evolution_redis:/data

volumes:
  evolution_instances:
  evolution_postgres:
  evolution_redis:
```

---

## 2. Variables de entorno

`.env` (las relevantes — hay como 50 variables, el 90% queda en default):

```bash
# Servidor
SERVER_TYPE=http
SERVER_PORT=8080
SERVER_URL=https://evolution.tudominio.com  # URL pública

# Auth global (API key maestra)
AUTHENTICATION_API_KEY=<random-larguísimo>  # generar con: openssl rand -hex 32
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

# Base de datos
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:<password>@postgres:5432/evolution
DATABASE_CONNECTION_CLIENT_NAME=evolution

# Cache
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis:6379
CACHE_REDIS_PREFIX_KEY=evolution

# Webhook global (opcional, también se puede por instancia)
WEBHOOK_GLOBAL_URL=https://adzenda.tudominio.com/api/webhooks/whatsapp
WEBHOOK_GLOBAL_ENABLED=true
WEBHOOK_EVENTS_MESSAGES_UPSERT=true     # mensajes entrantes
WEBHOOK_EVENTS_MESSAGES_UPDATE=true     # delivery status (sent/delivered/read)
WEBHOOK_EVENTS_CONNECTION_UPDATE=true   # estado de conexión (connected/disconnected)

# QR code config
QRCODE_LIMIT=10  # reintentos antes de pedir nuevo QR

# Logs
LOG_LEVEL=ERROR  # en producción; DEBUG durante configuración
LOG_COLOR=true
```

Levantar con `docker compose up -d`. Queda corriendo en el puerto 8080.

---

## 3. Reverse proxy con HTTPS (Caddy o Nginx)

Si se va a exponer la API a internet (necesario para webhooks entrantes), conviene poner Caddy adelante. Es lo más simple:

```caddyfile
# Caddyfile
evolution.tudominio.com {
    reverse_proxy localhost:8080
}
```

Caddy resuelve el certificado Let's Encrypt automático.

---

## 4. Crear una instancia (= una "línea" de WhatsApp)

Para 3-5 clientes de AdZenda con 1 solo número, **una instancia única alcanza**. Si en el futuro cada cliente quiere su propia línea, se crean instancias adicionales.

```bash
curl -X POST https://evolution.tudominio.com/instance/create \
  -H "apikey: <AUTHENTICATION_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "adzenda-prod",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

La respuesta incluye un QR code en base64 + una `apikey` específica de la instancia (la que se usa para mandar mensajes).

---

## 5. Conectar el número

Dos formas:

### a. Vía QR (la común)

1. Tomar el QR del paso anterior (decodificar base64, o usar el endpoint `GET /instance/connect/{instanceName}` que lo devuelve listo).
2. Desde el celular con WhatsApp instalado: **WhatsApp → Configuración → Dispositivos vinculados → Vincular dispositivo** → escanear.
3. Listo. El número queda vinculado a Evolution.

### b. Vía pairing code (sin escáner)

Si no se puede escanear (número fijo, celular lejano), Evolution soporta pedir un código de 8 dígitos que se ingresa en WhatsApp.

A partir de ese momento, Evolution mantiene la sesión viva. Mientras el container corra, la sesión persiste.

---

## 6. Mandar un mensaje de prueba

### Texto

```bash
curl -X POST https://evolution.tudominio.com/message/sendText/adzenda-prod \
  -H "apikey: <instance-apikey>" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "59899123456",
    "text": "Hola, este es un mensaje de prueba desde AdZenda."
  }'
```

### Documento (PDF del informe)

```bash
POST /message/sendMedia/adzenda-prod
{
  "number": "59899123456",
  "mediatype": "document",
  "mimetype": "application/pdf",
  "media": "<base64>" o "<URL pública del PDF>",
  "fileName": "informe-semanal-2026-06-08.pdf",
  "caption": "Tu informe semanal."
}
```

### Imagen Story (1080x1920 con resumen visual)

```bash
POST /message/sendMedia/adzenda-prod
{
  "number": "59899123456",
  "mediatype": "image",
  "media": "<base64 o URL>",
  "caption": "Resumen visual"
}
```

---

## 7. Webhook hacia AdZenda

Configurar en Evolution la URL `https://adzenda.tudominio.com/api/webhooks/whatsapp`. Cada vez que un mensaje se entrega, se lee, falla, o cae la conexión, Evolution postea:

```json
{
  "event": "messages.update",
  "instance": "adzenda-prod",
  "data": {
    "key": { "id": "...", "remoteJid": "59899123456@s.whatsapp.net" },
    "status": "DELIVERY_ACK"
  }
}
```

Estados posibles: `PENDING`, `SERVER_ACK`, `DELIVERY_ACK`, `READ`, `ERROR`.

En AdZenda se actualiza el `DeliveryLog` con el status resultante.

---

## 8. Integración con el código de AdZenda

### Archivos nuevos sugeridos

```
src/lib/delivery/
├── email.ts        ✅ ya existe
├── pdf.tsx         ✅ ya existe
├── whatsapp.ts     ← nuevo (cliente HTTP contra Evolution)
└── story-image.ts  ← nuevo si se quiere imagen 1080x1920

src/app/api/webhooks/
└── whatsapp/route.ts  ← nuevo (recibe delivery status)
```

### Variables nuevas en `.env` de AdZenda

```bash
EVOLUTION_API_URL=https://evolution.tudominio.com
EVOLUTION_API_KEY=<instance-apikey>
EVOLUTION_INSTANCE_NAME=adzenda-prod
EVOLUTION_WEBHOOK_SECRET=<random>  # para validar webhooks entrantes
```

### Funciones en `whatsapp.ts` (~60 líneas)

- `sendText(to, text)`
- `sendDocument(to, pdfBuffer, fileName, caption)`
- `sendImage(to, imageBuffer, caption)`

### Schema Prisma

```prisma
model DeliveryConfig {
  // ... campos existentes
  whatsappEnabled    Boolean  @default(false)
  whatsappRecipients String[] // teléfonos E.164: "+59899123456"
}

model DeliveryLog {
  // ... campos existentes
  // channel ya soporta "EMAIL" | "WHATSAPP"
  // status ya soporta los estados
}
```

### Flujo de envío

1. Job semanal (`jobs/delivery.ts`) o envío manual (`actions/delivery.ts`).
2. Por cada destinatario de WhatsApp en `DeliveryConfig`:
   - Generar PDF del informe.
   - Subir PDF a un storage temporal (S3 o servir desde AdZenda con URL firmada de corta duración).
   - Llamar `whatsapp.sendDocument(recipient, pdfUrl, fileName, caption)`.
   - Crear entrada en `DeliveryLog` con status `PENDING`.
3. Webhook `/api/webhooks/whatsapp` recibe updates y actualiza el `DeliveryLog`.

---

## 9. Mantenimiento

### Actualizar Evolution

Cuando WhatsApp cambia el protocolo, Baileys se rompe y hay que actualizar:

```bash
docker compose pull
docker compose up -d
```

En general sin downtime más allá de ~30s. Conviene tener una rutina de chequeo mensual.

### Backups

- `evolution_instances` (volumen) — contiene la sesión multidevice. Si se pierde, hay que re-escanear el QR.
- `evolution_postgres` (volumen) — contiene config, instancias, mensajes históricos.

Backup diario con `tar` o snapshots del VPS.

### Monitoreo de estado de conexión

Por el webhook `CONNECTION_UPDATE` se sabe si el número se desconectó (ej: el cliente abrió WhatsApp Web en otro lado y "expulsó" la sesión). Conviene tener una alerta automática (email al admin o cron que verifique cada 1h):

```bash
GET /instance/connectionState/adzenda-prod
# → { "state": "open" | "close" | "connecting" }
```

Si `state !== "open"`, alertar al admin para re-vincular.

### Logs

Por default, Evolution loguea bastante. En producción bajar a `LOG_LEVEL=ERROR`. Si hay problemas de entrega, subir temporalmente a `DEBUG`.

---

## 10. Alternativa: Evolution API hosted

Si no se quiere operar el VPS, hay servicios que hostean Evolution por uno:

- **EvolutionAPI Cloud** (oficial) — ~USD 19/mes una instancia.
- **Codechat** (fork similar) — pricing similar.
- **WAAS / WhatsApp-API.io** — variantes con hosting incluido.

Pierde la gracia del "USD 5/mes" pero ahorra operar el servidor. Para 3-5 clientes con baja frecuencia, puede valer la pena si el equipo no quiere mantener Docker.

---

## 11. Costos estimados

| Componente | Self-hosted | Hosted |
|------------|-------------|--------|
| VPS | USD 5/mes (DigitalOcean, Hetzner) | — |
| Evolution API | USD 0 (open source) | USD 19/mes |
| Dominio | ~USD 12/año (Cloudflare, Namecheap) | ~USD 12/año |
| Mensajes WhatsApp | USD 0 (vía protocolo Web) | USD 0 |
| **Total mensual** | **~USD 6** | **~USD 20** |

Para comparar: Twilio/YCloud serían USD 1-2/mes en mensajes + el trabajo de aprobación de plantilla.

---

## 12. Riesgos a tener presentes

- **TOS de WhatsApp.** Evolution va contra los términos. Meta puede banear el número sin previo aviso. Plan B: email + PDF siempre como respaldo.
- **Roturas de protocolo.** Cuando Meta cambia algo, Baileys (la lib base) puede tardar 1-3 días en adaptarse. Durante ese tiempo, el envío puede fallar.
- **Sesión expulsada.** Si alguien abre WhatsApp Web con el mismo número en otro lado, Evolution se desconecta. Hay que re-vincular escaneando otro QR.
- **Sin SLA.** No hay garantía de uptime. Si el cliente exige contrato con SLA, hay que ir a Twilio/YCloud.

---

## Próximos pasos cuando se decida implementar

1. Provisionar VPS y dominio.
2. Levantar Evolution API con el docker-compose de la sección 1.
3. Crear instancia y conectar número uruguayo dedicado.
4. Mandar mensaje de prueba con cURL.
5. Implementar `src/lib/delivery/whatsapp.ts` en AdZenda.
6. Implementar `src/app/api/webhooks/whatsapp/route.ts`.
7. Actualizar `DeliveryConfigForm` y `SendForm` con la opción WhatsApp.
8. (Opcional) Implementar generación de imagen Story con `@vercel/og`.
9. Configurar monitoreo de estado de conexión.
