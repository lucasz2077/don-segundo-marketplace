import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db/prisma";

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// En desarrollo, permitir acceso desde IP de red local (móvil -> PC)
// Better Auth valida el origin contra trustedOrigins; sin esto, rechaza
// requests desde 192.168.x.x, 10.x.x.x, etc. trustedOrigins solo acepta
// strings: los patrones wildcard (*) matchean cualquier subcadena del host.
const isDev = process.env.NODE_ENV === "development";
const trustedOrigins = isDev
  ? [
      baseURL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      // Allow any local IP on port 3000 (mobile on LAN)
      "http://192.168.*:3000",
      "http://10.*:3000",
      "http://172.*:3000",
    ]
  : [
      baseURL,
      // En producción, agregar explícitamente el dominio de Vercel
      // (baseURL ya debería ser https://tu-app.vercel.app)
      "https://*.vercel.app",
    ];

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  // Permitir origins de red local en dev + dominios Vercel en prod
  trustedOrigins,
  // nextCookies() maneja las cookies automáticamente para Next.js
  // (httpOnly, sameSite, secure, path, maxAge) — no sobrescribir manualmente
  user: {
    additionalFields: {
      role: {
        type: ["USER", "ADMIN"],
        input: false,
        defaultValue: "USER",
      },
      accountType: {
        type: ["BUYER", "SELLER", "BOTH"],
        defaultValue: "BOTH",
      },
      phone: {
        type: "string",
        required: false,
      },
      province: {
        type: "string",
        required: false,
      },
      locationLabel: {
        type: "string",
        required: false,
      },
      lastName: {
        type: "string",
        required: false,
      },
      dni: {
        type: "string",
        required: false,
      },
    },
  },
  plugins: [nextCookies()],
});
