/**
 * Parámetros SSL de libpq que `pg` interpreta desde la cadena de conexión y
 * que PISAN la opción `ssl` del pool. Con `sslmode=require`, `pg` exige
 * verificar el certificado y los poolers de Supabase (certificado propio)
 * fallan con "self-signed certificate in certificate chain", tirando todo el
 * sitio. El TLS se configura solo en el pool (src/lib/db/prisma.ts).
 */
const PARAMETROS_SSL = ["sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"];

/**
 * Devuelve la cadena de conexión sin los parámetros SSL de libpq. Si no es una
 * URL válida, la devuelve tal cual para que `pg` informe el error original.
 */
export function urlConexionSinSsl(url: string | undefined): string | undefined {
  if (!url) return url;

  let parseada: URL;
  try {
    parseada = new URL(url);
  } catch {
    return url;
  }

  for (const parametro of PARAMETROS_SSL) {
    parseada.searchParams.delete(parametro);
  }
  return parseada.toString();
}
