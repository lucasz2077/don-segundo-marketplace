import * as Sentry from "@sentry/nextjs";

import { opcionesSentry } from "@/lib/observabilidad";

/** Inicializa Sentry en el servidor (Node y Edge) al arrancar (RNF-14). */
export function register() {
  Sentry.init(opcionesSentry);
}

/** Reporta a Sentry los errores de páginas, rutas de API y Server Actions. */
export const onRequestError = Sentry.captureRequestError;
