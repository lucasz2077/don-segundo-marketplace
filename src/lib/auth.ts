import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db/prisma";

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const auth = betterAuth({
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
    },
  },
  plugins: [nextCookies()],
});
