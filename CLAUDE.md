@AGENTS.md

# Don Segundo — guía para Claude

Marketplace vertical del campo argentino (maquinaria, herramientas, insumos, hacienda, repuestos, servicios rurales). Monolito Next.js: UI, API Routes y lógica de negocio en un mismo deploy (Vercel + Supabase/PostgreSQL + Cloudinary + Mercado Pago).

## Idioma y convenciones (obligatorio)

- Todo en **español argentino profesional**: identificadores, comentarios, textos de UI, mensajes de error, docs. Términos técnicos establecidos (endpoint, middleware, ORM) y nombres de librerías quedan en inglés. Ver `docs/AGENTS.md`.
- Commits con conventional commits en español y con el ID del requisito cuando aplique: `feat(pagos): agrega ... (RF-39)`.
- Los requisitos están numerados (`RF-xx`, `RNF-xx`, `CA-xx`) en `docs/requirements.md`; el código y los tests los citan en comentarios. Si cambia el comportamiento, actualizar `docs/requirements.md`, `docs/database.md` y/o `docs/architecture.md` en el mismo trabajo ("documentos vivos", ver `docs/ROADMAP.md`).
- `src/AGENTS.md` define un rol de agente **solo frontend** (no tocar backend sin autorización). Leelo antes de trabajar en UI.

## Stack y versiones (ojo: más nuevas que tu training data)

- **Next.js 16.3** (App Router), React 19.2, TypeScript strict, Tailwind CSS 4 (tokens en `src/app/globals.css` vía `@theme`, sin `tailwind.config`).
  - El middleware se llama `src/proxy.ts` (export `proxy`), no `middleware.ts`.
  - `params` y `searchParams` son `Promise` y se hacen `await`.
  - `LayoutProps`/`PageProps` son tipos globales generados por `next dev`/`next build` (por eso `tsc` suelto falla si no existe `.next/types`).
  - Antes de usar una API de Next, consultar `node_modules/next/dist/docs/`.
- **Prisma 7** con `@prisma/adapter-pg`. El client se genera en `src/generated/prisma` (gitignored) y se importa desde `@/generated/prisma/client`. Config en `prisma.config.ts` (usa `DIRECT_URL` si existe, si no `DATABASE_URL`). En Vercel `DATABASE_URL` va al Transaction pooler de Supabase (6543); el Session pooler (5432) agotó las conexiones y tiró el sitio. Migraciones: Session pooler vía `DIRECT_URL`. Los parámetros `sslmode` de la URL se ignoran (`src/lib/db/url-conexion.ts`): pisaban la config TLS del pool.
- **Better Auth 1.6** (email + contraseña) con adapter Prisma; campos extra del usuario (`role`, `accountType`, `phone`, `province`, `dni`...) en `src/lib/auth.ts`.
- **Zod 4** para validación (`z.uuid()`, `z.enum`, mensajes en español).
- **Mercado Pago SDK 3** (Checkout Pro + OAuth de vendedores + webhooks + refunds).
- **Vitest 4** + Testing Library + jsdom.

## Comandos

```bash
npm ci
npx prisma generate          # obligatorio antes de lint/tests/tsc (genera src/generated/prisma)
npm run dev                  # http://localhost:3000
npm run lint                 # eslint (config next core-web-vitals + typescript)
npm run build                # prisma generate && next build
npx prisma migrate dev       # nueva migración en local
npx prisma migrate deploy    # aplicar migraciones (producción)
npm run db:seed              # categorías y subcategorías
npx vitest run               # tests (ver advertencia abajo)
npx vitest run src/lib/compras.test.ts   # un archivo puntual
```

**Advertencia de tests:** hoy no existe `vitest.config.ts` (tsconfig lo excluye pero nunca se commiteó) ni script `test` en `package.json`. Sin esa config falla el alias `@/` y no hay entorno jsdom, así que la mayoría de los tests no corre. El CI (`.github/workflows/ci.yml`) solo corre `prisma validate`, lint y build: no corre tests ni typecheck aparte.

Variables de entorno: ver `.env.example` (`DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_SECRET`, `CLOUDINARY_*`, `MP_ACCESS_TOKEN`, `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_WEBHOOK_SECRET`, `CRON_SECRET`; opcional `DIRECT_URL`).

## Estructura

```
prisma/schema.prisma         # modelo de datos (modelos y enums mezclan inglés de Fase 1 y español posterior)
prisma/migrations/           # incluye índice GIN fulltext manual (20260808212500_fulltext_search)
prisma/seed.ts               # categorías raíz + subcategorías
src/proxy.ts                 # redirige a /sign-in sin cookie de sesión (solo /dashboard)
src/app/                     # rutas en español: /listados, /publicar, /compras, /mensajes, /perfil/*, /admin/*, /vendedores/[id], /pagos/resultado
src/app/api/                 # API REST: listings, favoritos, conversaciones, notificaciones, reportes, ratings, verificaciones, compras, devoluciones, pagos (webhook, oauth), upload, perfil, direcciones
src/lib/                     # servicios de dominio, un archivo por dominio (listings.ts, compras.ts, reportes.ts, ratings.ts, verificaciones.ts, conversaciones.ts, notificaciones.ts, perfiles.ts...)
src/lib/pagos/               # ÚNICO lugar que importa el SDK `mercadopago` (mp, preferencias, pagos, oauth, reembolsos)
src/lib/validation/          # schemas Zod por dominio
src/lib/db/prisma.ts         # singleton PrismaClient (pool max 1, pensado para serverless)
src/lib/auth.ts, auth-client.ts, auth/session.ts   # Better Auth server, cliente y helper getSession()
src/components/<dominio>/    # componentes por dominio; primitivas en components/ui (Boton, Tarjeta, EstadoVacio, EstadoError, Skeleton)
docs/                        # visión, requisitos, arquitectura, base de datos, roadmap
```

La lógica vive en `src/lib/*.ts` (no en `src/lib/services/`, que está vacío pese a lo que dice `docs/architecture.md`).

## Patrones de la casa

- **Rutas API delgadas**: `getSession()` → parseo JSON → `schema.safeParse` → llamada al servicio de `src/lib` → mapeo de errores de dominio a HTTP. Cada ruta define un helper local `respuestaError(status, code, message)`.
- **Contrato de respuesta**: éxito `{ data }`; error `{ error: { code, message } }` con códigos en MAYÚSCULAS en español (`NO_AUTENTICADO`, `SIN_PERMISO`, `VALIDACION`, `NO_ENCONTRADA`, `ERROR_INTERNO`...).
- **Errores de dominio** como clases (`class SinStockError extends Error`) exportadas desde el servicio; la ruta las traduce con `instanceof`.
- **Admin**: chequeo del claim `session.user.role === "ADMIN"` en página/ruta **y** re-chequeo en base dentro del servicio (`esAdministrador` en `src/lib/reportes.ts`).
- **Concurrencia**: transiciones de estado atómicas con `updateMany` condicionado (`where: { estado: "PENDIENTE" }` / `stock: { gt: 0 }`) dentro de `prisma.$transaction`; `count === 0` significa carrera o ya procesado (no-op idempotente).
- **Notificaciones best-effort post-commit**: `crearNotificacion(...)` en `try/catch` después de la transacción; un fallo nunca revierte la operación principal.
- **Montos**: `Prisma.Decimal` (`Decimal(12,2)`), sin aritmética float; normalizar con `toFixed(2)`.
- **Soft delete** de publicaciones: `status: "DELETED"` + `deletedAt`. Moderación con `REJECTED` también setea `deletedAt`.
- **Páginas**: Server Components con `export const dynamic = "force-dynamic"`, sesión vía `getSession()` y `redirect("/sign-in")` si hace falta; los componentes interactivos son Client Components acotados que llaman a `/api/*` con `fetch`.
- **Tests**: junto al archivo (`*.test.ts(x)`), con `vi.hoisted` + `vi.mock("@/lib/db/prisma", ...)`; nunca se llama a MP real (se mockea `src/lib/pagos/*`).

## Flujo de pagos (resumen)

`POST /api/listings/[id]/comprar` crea `Compra` PENDIENTE (TTL 30 min) y una preferencia con el token del **vendedor** → redirect a `init_point` → MP llama `POST /api/pagos/webhook?compra=<id>` → se verifica firma (`MP_WEBHOOK_SECRET`) y el pago con `Payment.get` usando el token del **vendedor** (dueño del pago) → `aprobarPagoCompra` decrementa stock y marca APROBADO en una transacción; si no hay stock, la compra pasa a `REEMBOLSO_PENDIENTE` y se reembolsa (el cron diario `/api/cron/pagos` reintenta). Todo lo que se hace en nombre del vendedor usa `obtenerTokenVendedor` (renueva el token si vence pronto); los reembolsos llevan clave de idempotencia y el estado solo cambia con el refund confirmado. Devoluciones: comprador solicita (7 días desde `aprobadoAt`), vendedor resuelve en `/perfil/devoluciones`. Publicar exige cuenta MP vinculada (OAuth, `VendedorMpAccount`). Detalle en `docs/architecture.md` §6.2.
