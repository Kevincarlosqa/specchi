# SPECCHi — plataforma de belleza y wellness

Web pública, reservas, asistente de WhatsApp y panel de gestión para SPECCHi, grupo limeño de peluquería y spa con 39 años de experiencia y seis sedes.

> **Estado: demo para presentar la propuesta.** Sedes, horarios y carta de servicios provienen de specchi.com.pe. Especialistas, clientes, ventas, reseñas, stock y precios de productos son ficticios. Las fotos son de referencia (Unsplash).

## Pruébalo

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>. No hace falta configurar nada: sin `DATABASE_URL` la app corre en **modo demo** con una base en memoria. Los cambios se pierden al reiniciar el servidor, y en este modo no se envía ningún WhatsApp ni correo.

| Página | Qué es |
|---|---|
| `/` | Web pública |
| `/spa`, `/salon` | Carta completa con precios y duración |
| `/store` | Marcas de la tienda y gift cards |
| `/sedes` | Sedes, horarios y contacto |
| `/reservar` | Reserva con disponibilidad real |
| `/propuesta` | Presentación comercial con calculadora de retorno |
| `/login` | Entrada al panel con un clic por rol |

Usuarios del panel (contraseña `demo1234`):

| Usuario | Qué ve |
|---|---|
| `direccion@specchi.demo` | Todas las sedes, todo el panel |
| `admin@specchi.demo` | Igual que dirección, salvo crear otros usuarios de dirección |
| `gerencia.angamos@specchi.demo` | Angamos y Jockey Plaza |
| `gerencia.spa@specchi.demo` | Spa Swissôtel |
| `recepcion.angamos@specchi.demo` | Agenda, reservas, caja, clientes y WhatsApp de Angamos |
| `valeria@specchi.demo` | Su agenda, sus clientes y sus comisiones |

## Qué incluye el panel

Centro de mando con Radar de acciones · agenda con arrastrar y soltar · reservas · caja (POS, cierre, comprobantes) · bandeja de WhatsApp y simulador del bot · clientes con ficha configurable e historia de salud · campañas segmentadas · Club de puntos, gift cards y paquetes · reseñas por sede · analítica (cohortes, embudo, meta del mes, comparativa de sedes) · inventario · equipo, comisiones y asistencia · 2FA y registro de actividad. Atajo: `Ctrl/⌘ + K`.

Reglas y decisiones: [`docs/business-logic.md`](docs/business-logic.md).

## Subirlo a GitHub

El repositorio ya está inicializado en `main`, con un primer commit. Crea un repositorio vacío en GitHub y:

```bash
git remote add origin https://github.com/TU_USUARIO/specchi.git
git push -u origin main
```

El archivo `.env` no se versiona. El workflow de recordatorios se salta solo hasta que configures `APP_URL` y `CRON_SECRET`.

## Publicar la demo en Vercel

Importa el repositorio y despliega sin variables de entorno: queda en modo demo. Los buscadores no indexan el sitio mientras sea demo. La base vive en memoria de cada instancia, así que los cambios pueden reiniciarse en cualquier momento.

Si cambias `src/lib/seed-data.ts` o las migraciones, regenera la foto con `npm run demo:snapshot`. Conviene regenerarla también antes de una presentación importante: las fechas se corren por semanas completas, y la caja «de hoy» corresponde al día en que se generó.

## Stack

Next.js 16 (App Router, Cache Components, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Motion + Lenis · Recharts · Prisma 7 sobre PostgreSQL (PGlite en demo) · Zod 4 · Claude (`@anthropic-ai/sdk`) · WhatsApp Cloud API.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | `prisma generate` + build de producción |
| `npm run typecheck` | Tipos |
| `npm run lint` | ESLint |
| `npm test` | Disponibilidad, concurrencia, bot y correo (Vitest + PGlite) |
| `npm run demo:snapshot` | Regenera la foto de la base demo |
| `npm run db:migrate` / `db:deploy` | Migraciones |
| `npm run db:seed` / `db:seed:demo` | Usuario inicial / datos de ejemplo |

---

## Puesta en marcha en producción

### 1. Supabase (PostgreSQL)

1. Crea un proyecto en <https://supabase.com> y elige la región **São Paulo** (`sa-east-1`), la más cercana a Lima.
2. Ve a **Project Settings → Database → Connection string**:
   - **Transaction pooler** (puerto 6543): ponla en `DATABASE_URL` y agrega `?pgbouncer=true&connection_limit=1` al final.
   - **Session pooler o conexión directa** (puerto 5432): ponla en `DIRECT_URL`.
3. Copia `.env.example` a `.env` y completa los valores.
4. Aplica la migración y crea el usuario inicial:

   ```bash
   npm run db:deploy
   npm run db:seed          # usuario OWNER (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
   # Opcional, solo para una base de pruebas:
   npm run db:seed:demo
   ```

5. Inicia sesión en `/login` y, en **Configuración**, carga las sedes reales (las coordenadas del seed son aproximadas), los servicios, las especialistas y sus horarios. Crea los usuarios de cada sede en **Usuarios y roles**.

### 2. Claude (Anthropic)

1. Crea una API key en <https://console.anthropic.com>.
2. Defínela en `ANTHROPIC_API_KEY`. El modelo se elige con `AI_MODEL` (por defecto `claude-opus-5-5`) y la profundidad de razonamiento con `AI_EFFORT` (por defecto `medium`; `low` es más barato y suele bastar para conversar).
3. El agente (`src/lib/ai-agent.ts`):
   - usa thinking adaptativo y fallbacks del lado del servidor (`fallbacks: "default"`) por si el modelo declina una respuesta;
   - cachea las herramientas, el system prompt y el catálogo;
   - envía como historial los últimos 20 mensajes y un resumen que se regenera cada 30;
   - valida con Zod cada llamada a una herramienta. Nunca inventa precios ni horarios porque todo sale de la base de datos.

### 3. WhatsApp Cloud API (Meta)

1. En <https://developers.facebook.com> crea una app de tipo **Business** y agrégale el producto **WhatsApp**.
2. Registra el número de la cadena (un solo número para todas las sedes) y anota su **Phone number ID** en `WHATSAPP_PHONE_NUMBER_ID`.
3. Crea un **System User** en Business Manager con permiso `whatsapp_business_messaging`, genera un token permanente y guárdalo en `WHATSAPP_TOKEN`.
4. En **App settings → Basic** copia el **App Secret** en `WHATSAPP_APP_SECRET`. Sirve para validar la firma `X-Hub-Signature-256`.
5. En **WhatsApp → Configuration → Webhook**:
   - URL de callback: `https://TU-DOMINIO/api/whatsapp/webhook`
   - Token de verificación: el mismo valor que pongas en `WHATSAPP_VERIFY_TOKEN`
   - Suscríbete al campo **messages**.
6. **Plantillas.** Fuera de la ventana de 24 h, WhatsApp solo deja enviar plantillas aprobadas. Crea estas dos en **WhatsApp Manager → Message templates**, en español y de categoría *Utility*:
   - `recordatorio_cita`. Cuerpo: `Hola {{1}}, te recordamos tu cita: {{2}} el {{3}} en {{4}}.` Botones de respuesta rápida: *Confirmar*, *Reprogramar* y *Cancelar*.
   - `lista_espera_hueco`. Cuerpo: `¡Se liberó un espacio en {{1}} el {{2}}! Responde a este mensaje para reservarlo.`
7. El webhook responde 200 de inmediato, descarta los mensajes repetidos por `waMessageId` y responde en segundo plano con `after()` (`maxDuration = 60`).

> Los enlaces `wa.me` de cada sede en la landing y en el footer usan los números actuales de la cadena. Cuando migres a un solo número, actualiza el teléfono de cada sede en **Configuración → Sedes** y `WHATSAPP_PUBLIC_NUMBER`.

### 3b. Correo de aviso (Mailgun)

Con cada reserva nueva (web, WhatsApp o panel) el equipo recibe un correo con el logo y los datos de la cliente y de la cita. El correo se envía con `after()` y no retrasa la respuesta.

1. Crea una cuenta en <https://mailgun.com> y en **Send → Sending → Domains** agrega un subdominio, p. ej. `mg.specchi.com.pe`. Mailgun te dará registros DNS (TXT de SPF y DKIM, y MX); créalos en tu proveedor de dominio y pulsa **Verify**.
   - Para probar sin dominio puedes usar el dominio *sandbox* que Mailgun crea solo, pero solo entrega a los correos que agregues en **Authorized recipients** (y cada destinatario debe aceptar la invitación).
2. En **Domain settings → Sending API keys** crea una clave y guárdala en `MAILGUN_API_KEY`.
3. Variables:
   - `MAILGUN_DOMAIN`: el dominio verificado (`mg.specchi.com.pe` o el sandbox).
   - `MAILGUN_REGION`: `us` o `eu`, según la región del dominio.
   - `MAIL_FROM` (opcional): remitente. Por defecto `SPECCHi <reservas@MAILGUN_DOMAIN>`.
   - `BOOKING_NOTIFY_EMAILS`: destinatarios separados por coma.
4. El logo del correo se sirve desde `APP_URL/email/logo.png`, así que `APP_URL` debe ser el dominio público (no `localhost`).

### 4. Vercel

1. Importa el repositorio en <https://vercel.com/new>. Detecta Next.js solo, y `npm run build` ya ejecuta `prisma generate`.
2. Carga todas las variables de `.env.example` en **Settings → Environment Variables**, incluidas `APP_URL` con tu dominio y `CRON_SECRET` con una cadena aleatoria.
3. **Cron de recordatorios.** `GET /api/cron/reminders` envía los recordatorios de 24 h y 2 h; exige `Authorization: Bearer $CRON_SECRET` y es idempotente (llamarlo de más no duplica mensajes).
   - `vercel.json` lo programa **una vez al día** (13:00 UTC = 8:00 en Lima), que es lo máximo que permite el plan Hobby.
   - Para que corra **cada 15 minutos** gratis, el workflow `.github/workflows/reminders.yml` (GitHub Actions) llama al mismo endpoint. En GitHub → *Settings → Secrets and variables → Actions* crea `APP_URL` (p. ej. `https://tu-app.vercel.app`) y `CRON_SECRET` (el mismo de Vercel). Puedes lanzarlo a mano desde la pestaña *Actions* para probar.
   - Alternativa sin GitHub: [cron-job.org](https://cron-job.org), con la misma URL y la cabecera `Authorization`.
   - Con el plan **Pro** de Vercel puedes volver a `"*/15 * * * *"` en `vercel.json` y borrar el workflow.
4. Despliega y luego ejecuta `npm run db:deploy` contra la base de producción (desde tu máquina o en un paso de CI).
5. Configura la URL del webhook de Meta con el dominio final.

> **Datos de la demo.** Están en el archivo `prisma/demo-snapshot/pglite.tar.gz` (incluido en el código). Sin `DATABASE_URL`, la app lo carga en ~1 s; al cargarlo corre las fechas las semanas transcurridas, así la demo siempre muestra la semana actual. Si cambias los datos de ejemplo (`src/lib/seed-data.ts`), regenera el archivo con `npm run demo:snapshot` y súbelo.
>
> **Modo demo en Vercel.** Si no defines `DATABASE_URL`, cada instancia serverless arranca su propia base en memoria. Sirve para una preview, pero las reservas no se comparten entre instancias. En producción usa siempre Supabase.

---

## Arquitectura

```
src/
├─ app/
│  ├─ (site)/                      Web pública: inicio, spa, salón, store, sedes, reservar, propuesta
│  ├─ login/                       Login + server actions
│  ├─ dashboard/                   Panel: centro de mando, agenda, reservas, caja, WhatsApp, clientes, campañas, club, reseñas, analítica, inventario, equipo, seguridad
│  └─ api/
│     ├─ whatsapp/webhook          GET (verificación) / POST (firma, deduplicación, after())
│     ├─ cron/reminders            Recordatorios de 24 h y 2 h
│     ├─ public/{branches,catalog,availability,bookings}   API pública para la web
│     └─ dashboard/{conversations,simulator}               Bandeja (polling) y simulador
├─ lib/
│  ├─ availability-engine.ts       Motor de disponibilidad puro (sin BD), con tests
│  ├─ availability.ts              Carga de datos y consultas de disponibilidad
│  ├─ booking.ts                   Crear, reprogramar, cancelar y cambiar estado (transacción + advisory locks)
│  ├─ catalog.ts                   Catálogo por sede con overrides y sede más cercana
│  ├─ ai-agent.ts                  Agente de Claude + herramientas validadas con Zod
│  ├─ fallback-bot.ts              Flujo guiado por botones sin IA
│  ├─ conversations.ts             Mensajes entrantes y salientes, toma de control, lista de espera
│  ├─ whatsapp.ts                  Cloud API: firma, parseo, mensajes interactivos y plantillas
│  ├─ reminders.ts                 Recordatorios idempotentes
│  ├─ metrics.ts · analytics.ts    KPIs, cohortes, embudo, meta y comparativa de sedes
│  ├─ pos.ts                       Venta atómica: stock, comisión, puntos y gift cards
│  ├─ segments.ts · insights.ts    Segmentos de clientes y Radar de acciones
│  ├─ totp.ts                      Verificación en dos pasos
│  ├─ auth.ts · session.ts         Roles, alcance por sede y JWT
│  ├─ prisma.ts · demo.ts · seed-data.ts
│  └─ config.ts · time.ts · utils.ts · labels.ts
├─ components/{site,dashboard,brand}
└─ proxy.ts                        Chequeo optimista de sesión para /dashboard
```

### Seguridad y autorización

- `proxy.ts` solo comprueba que exista la cookie y redirige al login si falta.
- Cada página, server action y endpoint vuelve a validar en el servidor la sesión (firma del JWT, usuario activo), el rol y la sede (`requireUser`, `assertUser`, `bookingScope`, `customerScope`).
- No hay registro público: solo dirección y administración crean usuarios.
- Las contraseñas se guardan con bcrypt (coste 12) y la cookie es `httpOnly`, `sameSite=lax` y `secure` en producción.

### Concurrencia

`createBooking` toma `pg_advisory_xact_lock` por *sede + día* y luego por *especialista + día* (siempre en ese orden), vuelve a calcular la disponibilidad dentro de la transacción y, si el hueco ya se ocupó, lanza `SlotTakenError` con hasta 3 alternativas. Lo cubre el test `tests/booking-concurrency.test.ts`.

### Rendimiento y accesibilidad de la landing

- Las fotos pasan por `next/image` (AVIF/WebP, tamaños responsivos, carga diferida). Solo la primera foto del hero se carga con prioridad, y el carrusel arranca con la primera interacción para no competir con la carga inicial.
- Con `prefers-reduced-motion` no hay scroll suave, preloader, cursor propio, parallax ni carrusel.
- 

### Fotografía

Las fotos son de Unsplash y provisionales: se definen en `src/content/images.ts`.

## Pendientes antes de usarlo en producción

- [ ] Número de WhatsApp de empresa conectado a la API de Meta y plantillas aprobadas.
- [ ] Facturación electrónica con un proveedor autorizado por SUNAT (hoy el comprobante es interno).
- [ ] Pasarela de pago para adelantos y gift cards digitales (hoy los pagos solo se registran).
- [ ] API de Google Business Profile para leer reseñas, y pedido automático al terminar la cita.
- [ ] Atribución real de citas e ingresos a cada campaña.
- [ ] Migrar clientes, historial, productos, costos y stock reales; definir comisiones y esquema de puntos.
- [ ] Equipo real, fotos propias y testimonios autorizados.
- [ ] Verificar coordenadas y capacidad de cada sede, y las decisiones **[D]** de `docs/business-logic.md`.
- [ ] Revisar el tratamiento de datos de salud bajo la Ley 29733.
- [ ] Autorización de SPECCHi para usar su marca y sus datos antes de publicar la demo en una URL abierta.
