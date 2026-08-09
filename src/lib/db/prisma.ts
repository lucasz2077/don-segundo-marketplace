import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Serverless-friendly pool: bound each lambda to a single connection and
    // cap connection attempts so Supabase's pooler is never exhausted.
    // TLS: Supabase poolers use self-signed certificates, so do not reject the
    // chain (the connection is still encrypted).
    max: 1,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
