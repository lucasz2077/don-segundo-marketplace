import type { ConnectionOptions } from "node:tls";

const INICIO_PEM = "-----BEGIN CERTIFICATE-----";
const FIN_PEM = "-----END CERTIFICATE-----";

/**
 * TLS de la conexión a PostgreSQL (Supabase).
 *
 * - Con `DATABASE_CA_CERT` (el certificado raíz que Supabase ofrece para
 *   descargar, en formato PEM): se verifica el certificado del servidor contra
 *   esa CA y el nombre del host. Así nadie puede hacerse pasar por la base.
 * - Sin la variable: se mantiene el comportamiento anterior (conexión cifrada
 *   sin verificar la cadena), porque los poolers de Supabase usan una CA
 *   propia que Node no conoce.
 *
 * Se activa por entorno (primero Preview, después Production) y se revierte
 * borrando la variable.
 */
export function opcionesTls(
  entorno: Record<string, string | undefined> = process.env
): ConnectionOptions {
  const ca = normalizarPem(entorno.DATABASE_CA_CERT);
  if (!ca) {
    return { rejectUnauthorized: false };
  }
  return { ca, rejectUnauthorized: true };
}

/**
 * Vercel puede guardar el PEM con saltos de línea literales ("\n") o con
 * espacios/comillas alrededor si se pegó desde otro lado. Devuelve el PEM
 * limpio, o undefined si no parece un certificado.
 */
export function normalizarPem(valor: string | undefined): string | undefined {
  const limpio = (valor ?? "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/\\n/g, "\n")
    .trim();
  if (!limpio.includes(INICIO_PEM) || !limpio.includes(FIN_PEM)) {
    return undefined;
  }
  return `${limpio}\n`;
}
