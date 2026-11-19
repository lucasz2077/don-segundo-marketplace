import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db/prisma";
import { origenesConfiables } from "@/lib/auth/origenes-confiables";
import { configuracionRateLimit, encabezadosIp } from "@/lib/auth/limites-auth";
import { enviarEmailRestablecer, enviarEmailVerificacion } from "@/lib/auth/emails-auth";

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const trustedOrigins = origenesConfiables(baseURL, process.env);

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // RF-03: recuperación de contraseña por mail. Al cambiarla se cierran
    // las otras sesiones abiertas.
    sendResetPassword: enviarEmailRestablecer,
    revokeSessionsOnPasswordReset: true,
  },
  // RF-01: confirmación de email al registrarse. No bloquea el ingreso
  // (decisión D3, opción A): se puede mirar todo; publicar, comprar y
  // escribir van a exigir el email confirmado.
  emailVerification: {
    sendVerificationEmail: enviarEmailVerificacion,
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  // Límites de intentos en login, registro y contraseña (RNF-07).
  rateLimit: configuracionRateLimit,
  advanced: {
    ipAddress: { ipAddressHeaders: encabezadosIp },
  },
  // Red local en dev; en Vercel, solo la app y su propio deploy (RNF-04)
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
