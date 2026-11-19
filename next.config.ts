import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El DSN de Sentry se carga en Vercel como NEXT_SENTRY_DSN; acá se expone al
  // navegador para reportar errores del cliente (no es un secreto, RNF-14).
  env: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_SENTRY_DSN ?? "",
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
