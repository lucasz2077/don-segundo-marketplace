import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db/prisma";

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  // Nota: Better Auth v1.6 puede derivar la base URL del origin del request
  // automáticamente si se omite `baseURL` (ver resolveBaseURL/getBaseURL en
  // node_modules/better-auth/dist/utils/url.mjs). Aquí se mantiene explícita
  // con fallback a localhost; en el cliente el origin se resuelve en runtime
  // (ver src/lib/auth-client.ts) para soportar cualquier host de despliegue.
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
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
