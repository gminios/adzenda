# Canales de Entrega de Informes — Análisis y Alternativas

**Contexto:** AdZenda envía informes semanales a 3–5 clientes (textil/moda) en Uruguay. La meta es que el cliente reciba el informe en el celular y lo lea en 30s. Hoy el email + PDF ya está implementado; falta resolver el canal "móvil" (originalmente pensado como WhatsApp).

---

## 1. Integración con WhatsApp Cloud API (opción "oficial directa")

### 1.1 Setup en Meta (lo que demora días)

**a. Meta Business Manager + WhatsApp Business Account (WABA)**
- Crear (o usar uno existente) un Business Manager en business.facebook.com.
- Dentro, crear una WABA. Es la "cuenta" que agrupa números y plantillas.

**b. Número de teléfono dedicado**
- Que **no esté en uso** en WhatsApp/WA Business app (si lo estuvo, hay que borrarlo de la app y esperar).
- Puede ser celular o fijo (verificación por SMS o voz).
- Número exclusivo para esto, idealmente uruguayo (+598).

**c. App en Meta for Developers**
- Crear app tipo "Business" en developers.facebook.com.
- Agregar el producto **WhatsApp Cloud API**.
- Asociarla a la WABA. Esto da `Phone Number ID` y un token de prueba (24h).

**d. System User Token (el que va a producción)**
- En Business Manager → Configuración → Usuarios del sistema → Crear admin.
- Asignarle la WABA con permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
- Generar token **sin expiración**. Este es el que va en `WHATSAPP_ACCESS_TOKEN`.

**e. Verificación del negocio**
- Sin verificar: tope de 250 conversaciones únicas/24h y 1 solo número.
- Verificado: tiers de 1k → 10k → 100k → ilimitado.
- Para 3-5 clientes no se necesita escalar, pero **sí** verificar para mover el display name a "verde" y evitar fricciones. Pide documentos legales (RUT, dirección, etc.).

**f. Plantilla aprobada (CRÍTICO)**
- WhatsApp **no permite enviar texto libre proactivo**. Si el cliente no escribió en las últimas 24h, sólo se puede mandar una *Template Message* aprobada por Meta.
- Crear plantilla categoría **Utility** (transaccional). Marketing sale más cara y se rechaza más fácil.
- Estructura sugerida:
  - **Header:** imagen (la Story 1080x1920 que pide el US-27) o documento (PDF).
  - **Body:** `Hola {{1}}, tu informe semanal de {{2}} ya está listo. Esta semana: gasto {{3}}, retorno {{4}}. Mirá los detalles en el archivo adjunto.`
  - **Footer:** "AdZenda"
  - **Botón** (opcional): URL al informe web.
- Aprobación: 1h – 48h.

### 1.2 Lo técnico (en código, 1-2 días)

**a. `src/lib/delivery/whatsapp.ts`**
- `uploadMedia(buffer, type)` → POST a `/v21.0/{PNID}/media` para subir PDF/imagen, devuelve `media_id`.
- `sendTemplateMessage(to, templateName, lang, components)` → POST a `/v21.0/{PNID}/messages`.
- Manejo de errores Meta (códigos `131026` número no en WhatsApp, `131047` ventana 24h, `132001` plantilla no encontrada).

**b. `src/lib/delivery/story-image.ts` (US-27)**
- PNG 1080x1920 con KPIs + semáforo + 3 acciones.
- Recomendado: `@vercel/og` (ya viene con Next.js 15).

**c. Schema**
- `DeliveryConfig.channels` ya soporta `WHATSAPP`.
- `DeliveryConfig.whatsappRecipients` (string[] con teléfonos E.164: `+59899123456`).

**d. `src/lib/actions/delivery.ts` + `jobs/delivery.ts`**
- Iterar destinatarios WhatsApp: subir media → `media_id` → `sendTemplateMessage` → log en `DeliveryLog`.

**e. Webhook (opcional pero recomendado)**
- `app/api/webhooks/whatsapp/route.ts` para actualizar `DeliveryLog.status` (sent/delivered/read/failed).

**f. UI**
- `DeliveryConfigForm` con checkbox "WhatsApp" + input de números.
- `SendForm` con selector de canal.

### 1.3 Costo (Uruguay)

- Conversación **Utility** a Uruguay: aprox USD 0.029–0.040 por ventana de 24h (varía por trimestre, Meta publica tarifas en sus pricing pages).
- 5 clientes × 1 informe/semana = USD 0.15–0.20/semana = **menos de USD 1/mes**.

### 1.4 Riesgos

- **Bloqueo de cuenta de desarrollador** — historial conocido en este proyecto. Sin explicaciones, sin SLA de soporte.
- **Plantilla rechazada** — Meta puede rechazar redacción que considere "promocional".
- **Verificación de negocio** — pide documentación y puede demorar semanas.
- **Dependencia de Meta** para una funcionalidad de bajo volumen.

---

## 2. Alternativas (sin tocar Meta directamente)

### 2.1 BSP — Business Solution Provider (Meta sigue atrás, pero alguien más se come el lío)

Son partners oficiales de Meta que gestionan la WABA y la aprobación de plantillas en tu nombre. Vos te integrás contra su API, ellos hablan con Meta.

| Proveedor | Modelo | Bueno para | Notas |
|-----------|--------|-----------|-------|
| **Twilio** | Pay-per-message (fee ~USD 0.005 + costo conversación Meta) | MVPs, bajo volumen, equipos técnicos | SDK Node muy maduro, sandbox gratis para pruebas, documentación excelente, empresa pública US. Markup más alto pero más respaldo. |
| **YCloud** | Pay-per-message (fee menor que Twilio, descuentos por volumen) | Foco exclusivo WhatsApp, equipos que quieren UI lista | BSP especializado en WhatsApp (Singapur, 2019). Onboarding self-service más simple, inbox/CRM básico incluido. Menor ecosistema de integraciones, factura desde Singapur. |
| **360dialog** | Suscripción mensual fija (~EUR 49/mes) | Volumen alto | No cobra por mensaje. Para 5 clientes es overkill. |
| **MessageBird / Bird** | Pay-per-message | Empresas medianas | Similar a Twilio, menos popular en LATAM. |
| **Wati / Respond.io** | SaaS con UI lista | No-técnicos | Incluye CRM, inbox compartida. Mensual fijo USD 39+. |

**Pros:** te evitás trámites con Meta. Twilio gestiona la verificación de número y plantilla.
**Contras:** seguís dependiendo de WhatsApp como red, seguís necesitando plantilla aprobada (Twilio la sube por vos pero Meta sigue aprobando), seguís sujeto a políticas de WhatsApp Business.

**Veredicto:** Si el cliente **exige** WhatsApp, esta es la salida más cómoda. Twilio sandbox permite empezar a probar en 5 minutos.

### 2.2 Telegram Bot API (la opción "olvidate de Meta")

- **Costo:** USD 0.
- **Setup:** 5 minutos. Hablás con `@BotFather` en Telegram, te da un token.
- **Trámites:** ninguno. Ni verificación de negocio, ni plantillas, ni aprobaciones.
- **Capacidad:** texto enriquecido (Markdown/HTML), documentos (PDF), imágenes, botones inline.
- **Onboarding del cliente:** el cliente busca el bot (`@AdZendaBot`) y le manda `/start`. Eso es todo. El bot guarda el `chat_id` y a partir de ahí le podés mandar lo que quieras, cuando quieras, sin restricción de ventana de 24h.
- **API:** sencillísima (`POST https://api.telegram.org/bot{TOKEN}/sendDocument`).

**Pros:**
- Sin Meta de por medio.
- Sin plantillas, sin verificaciones, sin fee por mensaje.
- Sin riesgo de baneo arbitrario.
- Mensajes ricos (Markdown nativo, no limitado como WhatsApp).
- Se puede mandar el PDF y la imagen Story en el mismo chat sin restricciones.

**Contras:**
- Penetración de Telegram en Uruguay para el segmento textil/moda es **moderada**, no universal. WhatsApp es la app por defecto.
- Hay que pedirle al cliente que use otra app (fricción inicial mínima pero real).

**Veredicto:** **La mejor opción si el cliente está dispuesto.** Cero infraestructura, cero costo, cero burocracia.

### 2.3 SMS (Twilio o similar)

- **Costo Uruguay:** USD 0.05–0.10 por SMS (varía por carrier).
- **Setup:** cuenta Twilio + número virtual (~USD 1/mes).
- **Capacidad:** 160 caracteres por SMS. Sin adjuntos.
- **Estrategia:** mandar SMS con link al informe web (URL única con token).

**Pros:** llega a cualquier número, no requiere app.
**Contras:** caro relativo, sin adjuntos, requiere generar páginas web públicas del informe.

**Veredicto:** Razonable como **canal de aviso** ("Tu informe está listo: <link>"). No reemplaza el informe en sí.

### 2.4 Email enriquecido + link público (lo que ya casi tenés)

- Ya está implementado el email + PDF adjunto.
- Mejora simple: generar una **URL pública del informe** con token único (sin login), responsive, optimizada para móvil. El email lleva el link grande "Ver informe" + el PDF como respaldo.

**Pros:** cero infraestructura nueva, cero costo, cero trámite.
**Contras:** muchos clientes no leen email, fricción de abrirlo en el celular.

**Veredicto:** Es el piso. Cualquier otro canal se suma encima.

### 2.5 Evolution API (WhatsApp self-hosted, no oficial pero la opción "madura" del segmento)

**Qué es:** wrapper open-source en Node.js sobre Baileys, que reimplementa el protocolo de WhatsApp Multi-Device (el de WhatsApp Web). Se despliega con Docker, expone una **REST API + webhooks**, soporta **multi-instancia** (varios números/clientes en la misma instalación), y se integra nativo con n8n, Typebot, Chatwoot, Dify.

Es la opción "no oficial" más madura y popular hoy, especialmente en LATAM (origen brasileño). Muchísima automatización del segmento PyME corre arriba de Evolution.

**Pros para este caso:**
- **No tocás Meta para nada.** Ni cuenta de desarrollador, ni Business Manager, ni verificación. Punto a favor enorme dado el antecedente de bloqueo en Meta.
- **No hay plantilla.** Mandás el informe como texto + PDF + imagen, libre, en cualquier momento. Encaja perfecto con el formato del producto (3 párrafos + 3 action cards + adjuntos).
- **Multi-instancia.** Cada cliente puede tener su propia línea.
- **Volumen muy bajo.** 5 mensajes por semana, cada uno a un destinatario distinto, no se parece a spam. Reduce la probabilidad de detección.
- **Costo:** USD 0 de licencia + hosting de un VPS chico (~USD 5/mes).
- **Setup técnico:** 2-3h levantando Docker y conectando el número con QR.

**Contras:**
- **Va contra los TOS de WhatsApp.** Meta puede banear el número sin previo aviso, sin apelación posible.
- **Cuando Meta rompe el protocolo en Baileys, te quedás sin servicio** hasta que actualicen la librería (en general 1-3 días).
- **El número se quema si te banean.** Hay que conseguir otro y re-onboardear clientes.
- **Necesitás un servidor que mantenga la sesión.** No es serverless: la conexión WebSocket tiene que estar viva. VPS chico (DigitalOcean, Hetzner, etc.).
- **Sin métricas oficiales.** Las que da Baileys (sent/delivered/read) son inferidas de los acks de WhatsApp.

**Lectura honesta:** para **3-5 clientes, 1 informe semanal, contenido transaccional** (no marketing, no bulk), el riesgo de baneo es **real pero bajo**. Es russian roulette con balas blandas: si pasa, dolor moderado (cambiar número, re-pedirle al cliente que guarde el nuevo). Si no pasa, te ahorraste todos los trámites de Meta + el costo del BSP.

**Cuándo Evolution SÍ tiene sentido:**
- Volumen bajo y previsible (es este caso).
- Mensajes transaccionales, no promocionales (es este caso).
- Aceptás operar un VPS chico.
- Tenés plan B claro si te banean (ej: email + Telegram como respaldo).

**Cuándo NO:**
- Si la disponibilidad de WhatsApp es **contractual** con SLA.
- Si el número que vas a usar es importante para vos o para el negocio.
- Si tenés que escalar a 50+ clientes.

### 2.6 Otras opciones no oficiales (NO recomendadas)

- **Baileys / whatsapp-web.js / Venom / WPPConnect crudos** — son las librerías que están atrás de Evolution. Sin Evolution arriba tenés que escribir todo (auth, persistencia de sesión, webhooks, multi-instancia). Mismo riesgo de baneo pero más laburo.
- **Ultramsg, Wassenger, Chat-API.com** — SaaS de pago basados en lo mismo. Quitan trabajo técnico pero suman dependencia de un tercero que también puede ser baneado o cerrar.

---

## 3. Recomendación

Dado el contexto (Uruguay, 3-5 clientes, frecuencia baja, antecedente de bloqueo en Meta, deseo de evitar dolores de cabeza), tres caminos honestos en orden de "menor dolor de cabeza":

### Opción A — **Telegram Bot (la más prolija)**

1. Crear `@AdZendaBot` con BotFather.
2. Implementar `src/lib/delivery/telegram.ts` (50 líneas).
3. En `DeliveryConfig`, guardar `telegramChatId` por destinatario.
4. Onboarding cliente: link `https://t.me/AdZendaBot?start={tenantId}` que les manda mensaje con un código para confirmar.
5. **Tiempo:** medio día. **Costo:** USD 0. **Riesgo:** nulo.

**Contra único:** el cliente necesita Telegram (no universal en Uruguay).

### Opción B — **Evolution API (la más práctica si insisten con WhatsApp)**

1. Levantar Evolution API en un VPS chico (Docker compose, 2-3h).
2. Conectar un número uruguayo dedicado escaneando QR.
3. Implementar `src/lib/delivery/whatsapp.ts` contra la REST API de Evolution.
4. Configurar webhook para recibir delivery status.
5. **Tiempo:** 1 día. **Costo:** ~USD 5/mes de VPS. **Riesgo:** moderado (baneo posible, no probable a este volumen).

**Contra principal:** sin SLA, sin garantía. Hay que tener plan B (email siempre).

### Opción C — **Twilio o YCloud WhatsApp (la más "blindada" si necesitan SLA)**

1. Cuenta en Twilio o YCloud.
2. Sandbox para pruebas (gratis, los destinatarios opt-in con palabra clave).
3. Para producción: el BSP asiste con creación de WABA + plantilla.
4. Implementar `src/lib/delivery/whatsapp.ts` contra la API del BSP.
5. **Tiempo:** 1-2 días + 1-7 días de aprobación de plantilla. **Costo:** ~USD 1-2/mes. **Riesgo:** bajo.

**Contra principal:** seguís dependiendo de Meta (vía el BSP). Plantilla obligatoria.

### Opción D — **Combinar**

- Email + PDF (ya hecho) como respaldo siempre.
- Telegram como canal preferido para los clientes que aceptan.
- Evolution API para los que sólo quieren WhatsApp (con conciencia del riesgo).
- Twilio/YCloud sólo si algún cliente exige SLA contractual.

---

## Decisión pendiente

- ¿Telegram para todos? (más prolijo, fricción con clientes que no usan)
- ¿Evolution API? (sin Meta, con riesgo controlado)
- ¿Twilio/YCloud? (con SLA, con plantilla)
- ¿Combinar Telegram + Evolution + Email como fallback? (más flexible)
