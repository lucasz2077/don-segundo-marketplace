import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db/prisma";
import { origenesConfiables } from "@/lib/auth/origenes-confiables";

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
