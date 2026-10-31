import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";
import { urlConexionSinSsl } from "@/lib/db/url-conexion";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Tiempo que una conexión puede quedar inactiva en el pool antes de cerrarse.
 * Corto a propósito: en serverless cada conexión ocupa un lugar del pooler de
 * Supabase, y en modo sesión el cupo se agota (EMAXCONNSESSION).
 */
const INACTIVIDAD_CONEXION_MS = 5000;

function createPrismaClient() {
  // Serverless-friendly pool: bound each lambda to a single connection and
  // cap connection attempts so Supabase's pooler is never exhausted.
  // TLS: Supabase poolers use self-signed certificates, so do not reject the
  // chain (the connection is still encrypted). Los parámetros SSL de la URL se
  // quitan porque pisarían esta configuración (ver url-conexion.ts).
  const pool = new Pool({
    connectionString: urlConexionSinSsl(process.env.DATABASE_URL),
    max: 1,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: INACTIVIDAD_CONEXION_MS,
    ssl: { rejectUnauthorized: false },
  });

  // En Vercel, una instancia suspendida no ejecuta timers: la conexión
  // inactiva quedaría abierta ocupando el pooler. attachDatabasePool mantiene
  // viva la función hasta que el pool cierra las conexiones inactivas. Fuera
  // de Vercel no hace nada.
  attachDatabasePool(pool);

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
