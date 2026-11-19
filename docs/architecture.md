# Arquitectura — marketplace-campo

## 1. Vista general

El sistema es una aplicación web de servidor único (monolito modular) sobre Next.js App Router. El frontend (React + Tailwind) y el backend (API Routes, lógica de negocio y acceso a datos) viven en el mismo deploy de Vercel. PostgreSQL (Supabase) es la única base de datos y Cloudinary el servicio de imágenes. La autenticación se integra como una capa dentro de la app.

```
┌──────────────────────────────────────────────────────────────────┐
│                        Next.js (Vercel)                          │
│                                                                  │
│  ┌─────────────────────┐      ┌─────────────────────────────┐   │
│  │  UI (React +        │      │  API Routes  /api/*         │   │
│  │  Tailwind)          │      │  (REST sobre App Router)    │   │
│  │  - Server Components│ ───▶ │                             │   │
│  │  - Server Actions   │      │  ┌──────────────────────┐   │   │
│  │  - Estados de auth  │      │  │ Autenticación        │   │   │
│  └─────────────────────┘      │  │ (Better Auth / Auth.js)│  │   │
│                               │  └──────────────────────┘   │   │
│                               │  ┌──────────────────────┐   │   │
│                               │  │ Lógica de negocio    │   │   │
│                               │  │ (servicios, validación│   │   │
│                               │  │ con Zod, permisos)    │   │   │
│                               │  └──────────────────────┘   │   │
│                               │  ┌──────────────────────┐   │   │
│                               │  │ Prisma Client        │   │   │
│                               │  └──────────────────────┘   │   │
│                               └─────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                 │                           │
                 ▼                           ▼
      ┌────────────────────┐      ┌────────────────────┐
      │ PostgreSQL         │      │ Cloudinary (CDN)   │
      │ (Supabase)         │      │ - Imágenes de      │
      │ - Datos relacional │      │   publicaciones    │
      │ - Row Level        │      │ - Optimización y   │
      │   Security (RLS)   │      │   transformaciones │
      └────────────────────┘      └────────────────────┘
```

Capas del flujo de una petición:

```
Cliente (React)  →  API Route (ruta, validación)  →  Servicio (lógica de negocio)
                      →  Prisma Client  →  PostgreSQL
                                  ↘  Cloudinary (subida/optimización de imágenes)
```

## 2. Justificación del stack

| Decisión | Justificación |
| --- | --- |
| **Next.js App Router** | Un solo framework para UI, API y renderizado. Server Components y Server Actions reducen JS enviado al cliente, clave para conectividad limitada. Deploy nativo en Vercel. |
| **React + TypeScript** | Ecosistema maduro, tipado en todo el stack (comparte tipos entre frontend y rutas), reduce errores y facilita el trabajo en equipo. |
| **Tailwind CSS** | Diseño responsive rápido y consistente, sin CSS global que mantener; ideal para iterar la UI móvil del público objetivo. |
| **API Routes** | Para un MVP no se justifica un backend separado. Evita infraestructura adicional, reduce latencia y simplifica el deploy. La lógica de negocio se mantiene fuera de las rutas para poder migrarla a un servicio dedicado si el dominio lo exige. |
| **PostgreSQL (Supabase)** | Base relacional sólida con funciones necesarias (RLS, PostGIS para ubicación), hosting administrado, backups y redimensionado sin operar servidores. |
| **Prisma ORM** | Esquema declarativo, migraciones versionadas, tipado generado y consultas seguras. Reduce errores de SQL y acelera el desarrollo del MVP. |
| **Cloudinary** | CDN de imágenes con transformaciones bajo demanda (WebP/AVIF, tamaños, crops). Evita servir archivos pesados y simplifica la subida desde el cliente. |
| **Vercel + Supabase + Cloudinary** | Los tres servicios se administran solos y tienen planes gratuitos suficientes para el MVP. La deuda es baja: cada uno puede reemplazarse (VPS, otro Postgres, otro storage) sin tocar la lógica. |

## 3. Estructura de carpetas

Estructura real del repositorio (las rutas de la app están en español):

```
don-segundo-marketplace/
├── prisma/
│   ├── schema.prisma                # modelos y enums
│   ├── migrations/                  # incluye el índice GIN fulltext manual
│   ├── seed.ts                      # categorías y subcategorías
│   └── scripts/                     # scripts de datos puntuales
├── public/marca/                    # logo e isotipo
├── src/
│   ├── proxy.ts                     # redirige a /sign-in sin sesión (páginas privadas)
│   ├── app/
│   │   ├── page.tsx                 # inicio
│   │   ├── listados/                # búsqueda y detalle /listados/[id]
│   │   ├── categorias/[slug]/       # listado por categoría
│   │   ├── vendedores/[id]/         # perfil público del vendedor
│   │   ├── publicar/                # crear y editar publicación
│   │   ├── compras/ favoritos/ mensajes/ notificaciones/
│   │   ├── perfil/                  # Mi cuenta: información, direcciones, publicaciones, devoluciones, verificación
│   │   ├── admin/                   # reportes y verificaciones (solo ADMIN)
│   │   ├── pagos/resultado/         # vuelta del checkout de Mercado Pago
│   │   ├── sign-in/ sign-up/ recuperar-contrasenia/ restablecer-contrasenia/
│   │   └── api/                     # API REST: listings, conversaciones, compras, devoluciones,
│   │                                # pagos (webhook, oauth), reportes, ratings, verificaciones,
│   │                                # favoritos, notificaciones, perfil, direcciones, upload, cron, auth
│   ├── components/
│   │   ├── ui/                      # primitivas del sistema de diseño (Boton, Campo, Alerta...)
│   │   └── <dominio>/               # listing, compras, mensajes, perfil, auth, layout...
│   ├── lib/
│   │   ├── <dominio>.ts             # servicios: listings, compras, conversaciones, reportes, ratings...
│   │   ├── pagos/                   # único lugar que importa el SDK de Mercado Pago
│   │   ├── email/                   # único lugar que habla con Resend + plantillas
│   │   ├── auth/                    # sesión, orígenes confiables, límites, mails de auth
│   │   ├── validation/              # schemas Zod por dominio
│   │   └── db/                      # PrismaClient singleton y URL de conexión
│   ├── generated/prisma/            # cliente Prisma generado (no se versiona)
│   └── test/setup.ts                # setup de Vitest
├── .github/workflows/ci.yml         # prisma validate, lint, tests y build
├── vercel.json                      # cron diario de pagos
└── vitest.config.mts
```

## 4. Capas

### 4.1 UI (React + Tailwind)

- Server Components para listados, detalle y páginas públicas (menos JS, mejor SEO y carga).
- Componentes interactivos (formularios, galería, favoritos) como Client Components acotados.
- Diseño mobile-first con navegación inferior tipo app para el público rural.
- Sistema de diseño propio (tokens en `src/app/globals.css`, primitivas en `src/components/ui/`, íconos `lucide-react`, solo modo claro): ver `docs/design-system.md`.
- No se aplica lógica de negocio en el cliente: el cliente solo presenta y envía datos.

### 4.2 API Routes

- REST simple bajo `/api/*`, con validación de entrada en cada ruta mediante schemas Zod.
- Las rutas orquestan servicios; nunca escriben SQL directamente ni duplican reglas de negocio.
- Convención de respuesta: JSON consistente con `{ data }` o `{ error: { code, message } }`.

### 4.3 Lógica de negocio (servicios)

- Módulos por dominio: listings, search, favorites, contact, moderation, notifications, pagos, compras, ratings, verificaciones.
- Los mails transaccionales salen por Resend desde `src/lib/email/enviar.ts`, el único módulo que habla con el proveedor (API HTTP con `fetch`, sin SDK; los tests lo mockean). Nunca lanza: devuelve `false` si falta configuración (`RESEND_API_KEY`/`EMAIL_REMITENTE`) o si el envío falla. Las plantillas en español (`src/lib/email/plantillas.ts`) escapan los datos del usuario. `crearNotificacion` (`src/lib/notificaciones.ts`) despacha además el mail de cada notificación con `waitUntil` (`enviarEmailNotificacion`, idempotencia `notificacion-<id>`, agrupado de mensajes por conversación); `destinoNotificacion` define el enlace de la bandeja y del mail. Los mails de Better Auth (confirmación y recuperación, `src/lib/auth/emails-auth.ts`) se despachan con `waitUntil` para no demorar la respuesta.
- La integración con Mercado Pago (SDK `mercadopago`) vive aislada en `src/lib/pagos/` (mp, preferencias, pagos, oauth, reembolsos): es el ÚNICO lugar que importa el SDK, para poder mockear el wrapper en tests sin llamadas reales (RNF-16..RNF-20).
- Validación (Zod), autorización por rol y reglas del dominio viven en esta capa, no en las rutas.
- Aislar la lógica acá permite probarla con unit tests sin HTTP y migrarla a un servicio backend dedicado en el futuro.

### 4.4 Acceso a datos (Prisma / PostgreSQL)

- Un único cliente Prisma por instancia (singleton) para evitar agotar conexiones en serverless.
- RLS de Supabase como segunda barrera: incluso si la API es comprometida, las filas quedan protegidas a nivel de base.
- Las consultas de búsqueda usan índices y `where` compuestos para evitar escaneos completos.

### 4.5 Cloudinary

- Subida de imágenes firmada desde el cliente (presets de carga) para no exponer credenciales.
- Transformaciones bajo demanda para servir WebP/AVIF y tamaños según contexto (thumbnail, galería, hero).
- Eliminación de assets huérfanos al borrar o reemplazar imágenes de una publicación.
- Titularidad: `POST /api/upload` sube cada imagen con public_id `<userId>/<uuid>` (carpeta `don-segundo`). Al crear o editar una publicación, el servidor solo acepta imágenes cuyo public_id lleve el id del usuario y cuya URL sea de Cloudinary y apunte a ese public_id (o imágenes que ya estaban guardadas en esa publicación); si no, responde 400 `IMAGEN_INVALIDA` (`src/lib/imagenes.ts`). Así nadie puede asociar, y después borrar, imágenes ajenas.

### 4.6 Chat con polling eficiente

- El chat de la Fase 2 usa polling por cursor (`after: createdAt`) en lugar de websockets: el cliente consulta mensajes nuevos cada 3-5 s solo mientras la conversación está abierta, con respuestas livianas e incrementales.
- Justificación: cero infraestructura adicional en Vercel serverless; suficiente para el volumen esperado del marketplace; el modelo `Conversation`/`Message` y sus índices ya soportan las consultas.
- El envío es optimista con dedupe por idempotencia; el rate limiting del envío sigue la regla RNF-07.
- Reevaluación: si el volumen de chat crece y el polling degrada el costo/rendimiento, se evalúa SSE o websockets con servicio dedicado sin cambiar el contrato de la API.

## 5. Decisión de autenticación

### Recomendación: **Better Auth**

| Criterio | Better Auth | Auth.js (NextAuth v5) |
| --- | --- | --- |
| Modelo de datos | Schemas listos para Prisma, coherentes con el stack | Requiere adaptar esquemas y configuración de sesión por cuenta propia |
| Sesiones en serverless | Diseñado para entorno serverless con base de datos | Soporte existente pero con más piezas a configurar y matices de versiones |
| Enfoque Next.js App Router | Nativo: plugin de rutas y reactivo a Server Components | Nativo también, pero con mayor superficie de configuración |
| Simplicidad para MVP | Menos configuración inicial y convenciones claras | Más flexible, más decisiones que tomar |
| Madurez | Menor trayectoria que Auth.js | Muy maduro y ampliamente adoptado |
| Riesgo principal | Ecosistema joven; cambios de API posibles | Versión 5 (App Router) aún con ajustes entre versiones |

**Justificación:** Better Auth reduce el tiempo de integración con Prisma y el entorno serverless de Vercel, y su esquema encaja sin fricción con el modelo de datos de este proyecto. Para un MVP que prioriza velocidad de lanzamiento sobre máxima flexibilidad, es la opción con mejor relación simplicidad/adecuación.

**Cuándo reevaluar:** si el proyecto requiere estrategias de autenticación muy específicas (SSO corporativo, muchos proveedores OAuth avanzados, políticas de sesión personalizadas) o si la evolución de Better Auth introduce fricción, migrar a Auth.js o a un servicio de identidad dedicado (p. ej. WorkOS) es viable porque la capa de auth queda aislada en `lib/auth`.

## 6. Flujo de datos principal: crear publicación

```
1. Usuario completa el formulario de creación en /listings/new
   (título, descripción, categoría, condición, precio, ubicación, imágenes).
2. El cliente sube las imágenes a Cloudinary (subida firmada) y obtiene URLs.
3. El cliente envía POST /api/listings con los datos y las URLs de imágenes.
4. La ruta valida el payload con el schema Zod de ListingInput.
5. El servicio de listings verifica:
   - usuario autenticado y con rol vendedor (autorización);
   - integridad de datos (geocodificación opcional de la ubicación);
   - límite de imágenes y tamaño de texto.
6. El servicio persiste el Listing con estado "activa" y sus ListingImage
   en una transacción Prisma.
7. La ruta devuelve 201 con el recurso creado.
8. La UI redirige al detalle de la publicación recién creada.
9. Un evento de analítica registra la métrica "publicación creada".
```

Flujo de contacto (comprador → vendedor):

```
1. Comprador en /listings/[id] pulsa "Contactar vendedor".
2. POST /api/contact con mensaje (o redirección a WhatsApp/email configurada).
3. La ruta valida y crea el registro de contacto/conversación.
4. El servicio emite una notificación al vendedor (plataforma + email).
5. El comprador recibe confirmación; los datos de contacto se revelan
   únicamente en el canal autorizado por el vendedor.
```

Flujo de verificación de vendedores (Fase 3, Slice 2):

```
1. El vendedor (accountType SELLER/BOTH) solicita verificación desde su
   perfil: sube cada documento (identidad obligatoria, domicilio opcional)
   a POST /api/verificaciones/documentos, que lo guarda en Cloudinary como
   asset PRIVADO (type "authenticated", carpeta don-segundo-verificaciones,
   public_id <userId>/<uuid>) y devuelve solo el public_id; después envía
   esos public_id a POST /api/verificaciones (el service valida que sean
   suyos, 400 DOCUMENTO_INVALIDO).
2. El servicio valida que no exista una solicitud PENDING activa y crea
   una SolicitudVerificacion nueva; setea Profile.sellerVerified = PENDING.
3. El admin ve la solicitud en /admin/verificaciones con su documentación
   (solo admin, RNF-15) y el historial del vendedor (append-only).
4. El admin aprueba o rechaza (con motivo) vía PATCH /api/verificaciones/[id];
   la acción se registra con adminId y revisadoAt en la solicitud.
5. Al aprobar: Profile.sellerVerified = VERIFIED → el badge de verificación
   aparece en el perfil público y en el detalle de las publicaciones.
   Al rechazar: Profile.sellerVerified = REJECTED y el vendedor puede
   re-solicitar (RF-35). En ambos casos se notifica al vendedor.
6. Los documentos nunca se exponen fuera del panel admin (RNF-15): el panel
   enlaza a GET /api/verificaciones/[id]/documentos/[dni|domicilio], que exige
   admin (claim + DB), descarga el asset con URL firmada server-side y lo
   devuelve como JPG con Cache-Control no-store; la URL de Cloudinary nunca
   llega al navegador. Las solicitudes legadas con URL pública redirigen a
   ella hasta correr prisma/scripts/privatizar-documentos-verificacion.ts.
```

## 6.1 Autorización de admin

La autorización de admin se apoya en el patrón existente de moderación (Fase 2, Slice 5): chequeo de claim de sesión (`session.user.role === "ADMIN"`) en páginas y rutas, más re-chequeo en base (`esAdministrador(userId)` en `src/lib/reportes.ts`) dentro del service. La capa de verificación reutiliza ese mismo patrón (o extrae `validarAdministrador` a un módulo compartido) para las rutas admin de `/admin/verificaciones`; nunca confía solo en el claim de la sesión.

## 6.2 Flujo de pago y checkout (Fase 3, Slice 3)

```
Comprador → POST /api/listings/[id]/comprar (sesión obligatoria)
  → iniciarCompra(): valida 404/403(propia)/400(NO_ACTIVA)/409(SIN_STOCK)
  → tx Prisma: create Compra PENDIENTE { precioUnitario, currency, cantidad:1,
      estadoPago:PENDIENTE, fechaVencimiento: now+30min, marketplaceFee: precio*5% }
      (external_reference = compra.id; SIN decremento de stock ni SOLD — RF-26 mod.)
  → crearPreferenciaPago(compra, cuentaMpVendedor) en src/lib/pagos/preferencias.ts:
      Preference.create con token del VENDEDOR, external_reference = compra.id,
      back_urls success/failure/pending → APP_URL/pagos/resultado, marketplace_fee 5%,
      auto_return approved, expires + date_of_expiration = fechaVencimiento,
      items[0].title = título de la publicación,
      notification_url = APP_URL/api/pagos/webhook?compra=<compra.id>
  → si la preferencia falla: delete compensatorio de la Compra y 502 PAGO_INDISPONIBLE
  → { data: { compra: { id, estadoPago }, initPoint } } → redirect a init_point
    (checkout fuera de plataforma; el server NO ve tarjetas — RF-40)

MP → POST /api/pagos/webhook (pública, body { data: { id }, type: "payment" })
  → verificarFirmaMp: si MP_WEBHOOK_SECRET configurado, exige x-signature (HMAC-SHA256)
    → sin firma/secreto → 401/403 sin efecto (RNF-16)
  → procesarNotificacionPago(id, compra) en src/lib/compras.ts:
      con ?compra: Payment.get con el token del VENDEDOR de esa compra (el pago es suyo)
        y external_reference debe ser esa compra (si no → log, no-op)
      sin ?compra (preferencias viejas): Payment.get con MP_ACCESS_TOKEN — nunca body crudo
  → si status es rejected/cancelled → Compra PENDIENTE → FALLIDO (updateMany condicionado)
  → otro status ≠ approved → no-op, 200 { data: { recibido: true } }
  → si MP o la base fallan → 500 para que MP reintente (idempotente, RNF-17)
  → RF-46: monto/moneda ≠ Compra → log PAGO_INCONSISTENTE, no-op
  → aprobarPagoCompra() en $transaction (RNF-18, patrón updateMany condicionado):
      1. updateMany Compra PENDIENTE|EXPIRADA|FALLIDO → APROBADO (count 0 ⇒ no-op idempotente RNF-17)
      2. updateMany Listing { ACTIVE, deletedAt null, stock > 0 } → decrement 1 + soldCount
         ├─ count 1 → Compra { mpPaymentId, aprobadoAt, medioPago } + SOLD si stock = 0
         └─ count 0 → carrera SIN_STOCK → Compra REEMBOLSO_PENDIENTE SIN_STOCK en la tx;
            post-commit refund (token del vendedor, idempotencia sin-stock-<compra>) →
            REEMBOLSADO; si falla, el cron diario lo reintenta (D4)
  → post-commit best-effort: notifica venta paga al vendedor (nunca revierte — RF-45)
```

Devoluciones (RF-49..RF-51): comprador solicita en `/compras` (ventana 10 días desde `aprobadoAt`, solo APROBADA → 410 `VENTANA_EXPIRADA`); vendedor aprueba/rechaza en `/perfil/devoluciones`; al aprobar: toma atómica PENDIENTE → APROBADA, refund TOTAL con el token del vendedor e idempotencia `devolucion-<solicitud>`, y recién con el refund confirmado `$transaction` Compra REEMBOLSADO + `mpRefundId`/`montoReembolsado` + stock +1 y publicación PAUSED (D10). Si el refund falla la solicitud vuelve a PENDIENTE (502, log `REEMBOLSO_FALLIDO`) y el vendedor reintenta sin duplicar. RF-51: el comprador recibe el 100% y MP descuenta en proporción al vendedor y al `marketplace_fee` de Don Segundo.

Cron diario de pagos (`vercel.json` → `GET /api/cron/pagos`, `Authorization: Bearer $CRON_SECRET`): renueva los tokens de vendedor que vencen en menos de 30 días, reintenta los reembolsos `REEMBOLSO_PENDIENTE` y expira las órdenes PENDIENTES vencidas. Cada tarea es independiente.

OAuth de vendedores (RF-47..RF-48): `/perfil` → `GET /api/pagos/oauth/iniciar` → redirect a `auth.mercadopago.com.ar` con `state` CSRF de la sesión → `GET /api/pagos/oauth/callback` valida `state` y persiste `VendedorMpAccount` (tokens SOLO server-side, RNF-20). `crearPublicacion`/`actualizarPublicacion` exigen cuenta MP vigente (403 `MP_NO_VINCULADA`). Para operar en nombre del vendedor (preferencia, consulta de pago, reembolso) se usa `obtenerTokenVendedor`, que renueva el token si vence en menos de 7 días. El SDK `mercadopago` se importa únicamente en `src/lib/pagos/` (se mockea el wrapper en tests).

## 7. Seguridad

- **Validación:** Zod en todas las rutas y Server Actions; nunca se confía en el cliente.
- **Sanitización:** escape del HTML en títulos y descripciones al renderizar; no se permite HTML arbitrario.
- **Rate limiting (RNF-07):** contado en PostgreSQL para que valga en todas las instancias serverless. Autenticación por IP con el rate limit de Better Auth (`storage: "database"`, tabla `RateLimit`, `src/lib/auth/limites-auth.ts`, IP desde `x-real-ip`/`x-forwarded-for` que completa Vercel). Mensajes, consultas nuevas y publicaciones por usuario, contando filas existentes en los servicios (`src/lib/conversaciones.ts`, `src/lib/listings.ts`).
- **Secrets:** todas las credenciales en variables de entorno (`DATABASE_URL`, auth secrets, Cloudinary, email). Nunca en el repositorio; rotación periódica.
- **Autorización por rol:** roles `USER` y `ADMIN`; las rutas admin verifican rol en el servicio; los usuarios solo pueden mutar sus propios recursos (se valida el `ownerId` en cada operación).
- **Sesiones:** cookies `httpOnly`, `secure` en producción, y protección CSRF. El proveedor de auth maneja el hash de contraseñas con bcrypt/argon2.
- **Orígenes y redirecciones:** `trustedOrigins` sin comodines en producción (`src/lib/auth/origenes-confiables.ts`); `?redirect=` del login validado como ruta interna (`src/lib/auth/destino-seguro.ts`); `src/proxy.ts` protege las páginas privadas (`/perfil`, `/compras`, `/favoritos`, `/mensajes`, `/notificaciones`, `/publicar`, `/admin`, `/dashboard`).
- **TLS con la base:** la conexión a Supabase siempre va cifrada. Con `DATABASE_CA_CERT` (certificado raíz de Supabase en PEM) se verifica además el certificado y el nombre del servidor (`src/lib/db/tls.ts`), lo que impide que alguien se haga pasar por la base; sin la variable se cifra sin verificar la cadena (comportamiento anterior). Se activa por entorno en Vercel y se revierte borrando la variable.
- **RLS en Supabase:** políticas de fila que limitan lectura/escritura incluso a nivel de base, como defensa en profundidad.
- **Imágenes:** validación de tipo y tamaño en el preset de Cloudinary; URLs generadas por servidor.

## 8. Consideraciones de deploy

### Vercel + Supabase + Cloudinary (MVP)

- **Vercel:** frontend y API en un solo proyecto; preview deployments por PR; variables de entorno por ambiente.
- **Supabase:** base de datos con migraciones aplicadas por CI (prisma migrate) en staging y producción; RLS habilitado; backups automáticos.
- **Cloudinary:** presets de subida firmados; ambiente de pruebas y producción con credenciales separadas.
- **CI/CD:** pipeline que ejecuta lint, typecheck, tests y `prisma migrate deploy` en cada push a la rama principal.
- **Observabilidad:** Sentry para errores en frontend y API (`src/instrumentation.ts`, `src/instrumentation-client.ts`, configuración en `src/lib/observabilidad.ts`; DSN en `NEXT_SENTRY_DSN`, expuesto al cliente por `next.config.ts`); logs con códigos en mayúsculas (`EMAIL_FALLIDO`, `REEMBOLSO_FALLIDO`...) en Vercel.

### Migración futura a VPS

Si el volumen o los costos lo exigen (Fase 4):

1. **Base de datos:** replicar desde Supabase a PostgreSQL autogestionado (pg_dump/restore) sin tocar el código (Prisma abstrae el proveedor).
2. **Imágenes:** Cloudinary puede permanecer (CDN) o reemplazarse por almacenamiento propio con CDN.
3. **Aplicación:** mover Next.js a un contenedor (Docker) en el VPS con un reverse proxy (Caddy/Nginx); la API Routes y la lógica en `lib/services` no cambian.
4. **Escala horizontal:** la capa de servicios y Prisma permiten extraer un backend Node dedicado sin reescribir el dominio.

Esta ruta de migración está contemplada desde el diseño (lógica desacoplada de las rutas) para que el cambio sea de infraestructura, no de código de negocio.
