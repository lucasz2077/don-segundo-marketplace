import * as Sentry from "@sentry/nextjs";

import { opcionesSentry } from "@/lib/observabilidad";

// Errores del navegador (RNF-14). Sin DSN, Sentry queda apagado.
Sentry.init(opcionesSentry);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
