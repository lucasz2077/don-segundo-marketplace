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

## 3. Estructura de carpetas propuesta

```
marketplace-campo/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (main)/
│   │   │   ├── page.tsx                # Home / categorías
│   │   │   ├── search/                 # Búsqueda con filtros
│   │   │   ├── listings/
│   │   │   │   ├── [id]/               # Detalle de publicación
│   │   │   │   └── new/                # Crear publicación
│   │   │   ├── dashboard/
│   │   │   │   ├── listings/           # Mis publicaciones
│   │   │   │   └── favorites/          # Mis favoritos
│   │   │   └── admin/                  # Moderación
│   │   ├── api/
│   │   │   ├── auth/[...]              # Rutas de Better Auth / Auth.js
│   │   │   ├── listings/
│   │   │   │   ├── route.ts            # GET listado, POST crear
│   │   │   │   └── [id]/route.ts       # GET, PATCH, DELETE publicación
│   │   │   ├── favorites/route.ts
│   │   │   ├── contact/route.ts        # Contacto comprador-vendedor
│   │   │   ├── admin/
│   │   │   │   ├── listings/[id]/route.ts
│   │   │   │   └── reports/route.ts
│   │   │   └── uploads/route.ts        # Firmado de subida a Cloudinary
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                         # Primitivas (Button, Input, Modal…)
│   │   ├── listing/                    # Tarjetas, formularios, galería
│   │   └── layout/                     # Navbar, Footer, SearchBar
│   ├── lib/
│   │   ├── auth/                       # Config de autenticación
│   │   ├── db/                         # Cliente Prisma (singleton)
│   │   ├── validation/                 # Schemas Zod
│   │   ├── services/                   # Lógica de negocio
│   │   │   ├── listing-service.ts
│   │   │   ├── search-service.ts
│   │   │   ├── contact-service.ts
│   │   │   └── moderation-service.ts
│   │   ├── cloudinary.ts               # Upload presets / firmado
│   │   └── emails.ts                   # Emails transaccionales
│   └── types/                          # Tipos compartidos
├── .env / .env.local                   # Secrets (nunca en git)
├── .github/workflows/ci.yml
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

## 4. Capas

### 4.1 UI (React + Tailwind)

- Server Components para listados, detalle y páginas públicas (menos JS, mejor SEO y carga).
- Componentes interactivos (formularios, galería, favoritos) como Client Components acotados.
- Diseño mobile-first con navegación inferior tipo app para el público rural.
- No se aplica lógica de negocio en el cliente: el cliente solo presenta y envía datos.

### 4.2 API Routes

- REST simple bajo `/api/*`, con validación de entrada en cada ruta mediante schemas Zod.
- Las rutas orquestan servicios; nunca escriben SQL directamente ni duplican reglas de negocio.
- Convención de respuesta: JSON consistente con `{ data }` o `{ error: { code, message } }`.

### 4.3 Lógica de negocio (servicios)

- Módulos por dominio: listings, search, favorites, contact, moderation, notifications.
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

## 7. Seguridad

- **Validación:** Zod en todas las rutas y Server Actions; nunca se confía en el cliente.
- **Sanitización:** escape del HTML en títulos y descripciones al renderizar; no se permite HTML arbitrario.
- **Rate limiting:** límites por IP en autenticación, contacto y creación de publicaciones (p. ej. `@upstash/ratelimit` o middleware propio).
- **Secrets:** todas las credenciales en variables de entorno (`DATABASE_URL`, auth secrets, Cloudinary, email). Nunca en el repositorio; rotación periódica.
- **Autorización por rol:** roles `USER` y `ADMIN`; las rutas admin verifican rol en el servicio; los usuarios solo pueden mutar sus propios recursos (se valida el `ownerId` en cada operación).
- **Sesiones:** cookies `httpOnly`, `secure` en producción, y protección CSRF. El proveedor de auth maneja el hash de contraseñas con bcrypt/argon2.
- **RLS en Supabase:** políticas de fila que limitan lectura/escritura incluso a nivel de base, como defensa en profundidad.
- **Imágenes:** validación de tipo y tamaño en el preset de Cloudinary; URLs generadas por servidor.

## 8. Consideraciones de deploy

### Vercel + Supabase + Cloudinary (MVP)

- **Vercel:** frontend y API en un solo proyecto; preview deployments por PR; variables de entorno por ambiente.
- **Supabase:** base de datos con migraciones aplicadas por CI (prisma migrate) en staging y producción; RLS habilitado; backups automáticos.
- **Cloudinary:** presets de subida firmados; ambiente de pruebas y producción con credenciales separadas.
- **CI/CD:** pipeline que ejecuta lint, typecheck, tests y `prisma migrate deploy` en cada push a la rama principal.
- **Observabilidad:** Sentry para errores en frontend y API; logs estructurados para el backend.

### Migración futura a VPS

Si el volumen o los costos lo exigen (Fase 4):

1. **Base de datos:** replicar desde Supabase a PostgreSQL autogestionado (pg_dump/restore) sin tocar el código (Prisma abstrae el proveedor).
2. **Imágenes:** Cloudinary puede permanecer (CDN) o reemplazarse por almacenamiento propio con CDN.
3. **Aplicación:** mover Next.js a un contenedor (Docker) en el VPS con un reverse proxy (Caddy/Nginx); la API Routes y la lógica en `lib/services` no cambian.
4. **Escala horizontal:** la capa de servicios y Prisma permiten extraer un backend Node dedicado sin reescribir el dominio.

Esta ruta de migración está contemplada desde el diseño (lógica desacoplada de las rutas) para que el cambio sea de infraestructura, no de código de negocio.
