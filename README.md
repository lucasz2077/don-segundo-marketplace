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
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Copiar `.env.example` a `.env.local` y completar las variables de entorno (ver `.env.example` para la lista).

## Deploy (producción)

El proyecto se despliega en Vercel. Las migraciones de base de datos se
aplican con Prisma (no conviene correrlas desde el build).

1. Configurar las variables de entorno en el panel de Vercel (ver `.env.example`):
   - `DATABASE_URL`: string de conexión a Supabase apuntando a la base de producción, con `sslmode=require`.
   - `NEXT_PUBLIC_APP_URL`: el dominio público del sitio, p. ej. `https://tudominio.com`.
   - `BETTER_AUTH_SECRET`: secreto aleatorio de 32+ caracteres, estable entre deploys.
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`: credenciales de producción.
2. Aplicar las migraciones a la base de producción antes o como parte del deploy:
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
- [Roadmap](docs/roadmap.md)
