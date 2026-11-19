type Entorno = Record<string, string | undefined>;

/** Convierte un host de Vercel ("app-git-x.vercel.app") en origen https. */
function origenHttps(host: string | undefined): string[] {
  const limpio = host?.trim();
  if (!limpio) {
    return [];
  }
  return [limpio.startsWith("http") ? limpio : `https://${limpio}`];
}

/**
 * Orígenes que Better Auth acepta en las peticiones de login, registro y
 * sesión (protección CSRF, RNF-04).
 *
 * - Desarrollo: localhost y la red local (para probar desde el celular).
 * - Vercel (producción y previews): SOLO la URL pública de la app y las URLs
 *   de ESTE deploy (`VERCEL_URL`, `VERCEL_BRANCH_URL` y
 *   `VERCEL_PROJECT_PRODUCTION_URL`, variables de sistema de Vercel). Nunca
 *   el comodín `https://*.vercel.app`, que daba por confiable a cualquier
 *   app de cualquier usuario hosteada en Vercel.
 */
export function origenesConfiables(baseURL: string, entorno: Entorno): string[] {
  if (entorno.NODE_ENV === "development") {
    return [
      baseURL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      // Celular en la misma red: trustedOrigins acepta comodines (*).
      "http://192.168.*:3000",
      "http://10.*:3000",
      "http://172.*:3000",
    ];
  }

  const origenes = [
    baseURL,
    ...origenHttps(entorno.VERCEL_PROJECT_PRODUCTION_URL),
    ...origenHttps(entorno.VERCEL_BRANCH_URL),
    ...origenHttps(entorno.VERCEL_URL),
  ];
  return [...new Set(origenes)];
}
