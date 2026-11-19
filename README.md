# Don Segundo

Marketplace vertical para el campo argentino: compra y venta de maquinaria, herramientas, insumos, hacienda, repuestos y servicios rurales.

## Stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [Prisma](https://prisma.io) ORM sobre PostgreSQL (Supabase)
- [Cloudinary](https://cloudinary.com) para imágenes
- Deploy en [Vercel](https://vercel.com)

## Puesta en marcha

```bash
npm ci
npx prisma generate
npm run dev
```

Tests: `npm test`. Lint: `npm run lint`. Requiere Node 22.22 o superior.

Abrir [http://localhost:3000](http://localhost:3000).

Copiar `.env.example` a `.env.local` y completar las variables de entorno (ver `.env.example` para la lista).

## Deploy (producción)

El proyecto se despliega en Vercel. Las migraciones de base de datos se
aplican con Prisma (no conviene correrlas desde el build).

1. Configurar las variables de entorno en el panel de Vercel (ver `.env.example`):
   - `DATABASE_URL`: string de conexión del **Transaction pooler** de Supabase (puerto 6543; en Supabase: Connect → Direct → Transaction pooler). Sin `sslmode`: el TLS lo configura el código. No usar el Session pooler (5432) en Vercel: agota las conexiones y el sitio se cae.
   - `NEXT_PUBLIC_APP_URL`: el dominio público del sitio, p. ej. `https://tudominio.com`.
   - `BETTER_AUTH_SECRET`: secreto aleatorio de 32+ caracteres, estable entre deploys.
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`: credenciales de producción.
   - Mercado Pago (`MP_ACCESS_TOKEN`, `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_WEBHOOK_SECRET`), `CRON_SECRET` y mails (`RESEND_API_KEY`, `EMAIL_REMITENTE`): ver `.env.example`.
2. Aplicar las migraciones a la base de producción antes o como parte del deploy. Se corren desde una máquina local con `DIRECT_URL` (o `DATABASE_URL`) apuntando al **Session pooler** (puerto 5432), porque las migraciones no funcionan por el Transaction pooler:
   ```bash
   npx prisma migrate deploy
   ```
   `npm run build` incluye `prisma generate`, así que no hace falta regenerar el client a mano.
3. Importar el repositorio en Vercel (framework: Next.js). El build y el deploy quedan automatizados.
4. El dominio propio se configura en Vercel (Settings → Domains) y se refleja en
   `NEXT_PUBLIC_APP_URL`.

## Documentación

- [Visión](docs/vision.md)
- [Requisitos](docs/requirements.md)
- [Arquitectura](docs/architecture.md)
- [Base de datos](docs/database.md)
- [Roadmap](docs/ROADMAP.md)
- [Sistema de diseño](docs/design-system.md)
- [Convenciones para agentes](docs/AGENTS.md)
