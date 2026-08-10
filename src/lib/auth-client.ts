import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

// En el navegador la API siempre vive en el mismo origin que la app (incluso
// en Vercel u otros hosts), por eso se resuelve el origin en runtime. El valor
// de proceso.env.NEXT_PUBLIC_APP_URL (inline en build) solo se usa como
// fallback para SSR. Sin esto, un build con NEXT_PUBLIC_APP_URL apuntando a
// localhost rompe el login desde cualquier otro origin.
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

export const authClient = createAuthClient({
  baseURL,
  plugins: [inferAdditionalFields<typeof auth>()],
});
