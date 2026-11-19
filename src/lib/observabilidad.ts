/**
 * Configuración común de Sentry (RNF-14). El DSN llega por la variable
 * `NEXT_SENTRY_DSN` de Vercel; next.config.ts la expone al navegador como
 * `NEXT_PUBLIC_SENTRY_DSN` en el build (el DSN no es secreto: solo permite
 * enviar errores al proyecto). Sin DSN, Sentry queda apagado.
 */
export function dsnSentry(): string | undefined {
  const dsn = (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.NEXT_SENTRY_DSN || "").trim();
  return dsn || undefined;
}

export const opcionesSentry = {
  dsn: dsnSentry(),
  enabled: Boolean(dsnSentry()),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || "development",
  // Solo errores: sin trazas de rendimiento ni grabación de sesiones, para
  // no salir del plan gratuito.
  tracesSampleRate: 0,
  // No se envían IP, cookies ni datos del usuario (RNF-08).
  sendDefaultPii: false,
};

/** Error intencional para verificar que Sentry recibe los errores del servidor. */
export class ErrorDePruebaSentry extends Error {
  constructor() {
    super("Error de prueba de Sentry: si lo ves en Sentry, el monitoreo funciona.");
    this.name = "ErrorDePruebaSentry";
  }
}
