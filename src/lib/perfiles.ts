import { Prisma } from "@/generated/prisma/client";
import type { Currency, ListingCondition } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/** Cantidad mínima de conversaciones con respuesta para mostrar la métrica. */
export const MINIMO_MUESTRAS_METRICA = 3;

/** Muestras mínimas de reseñas para exponer el rating del vendedor (RF-24). */
export const MINIMO_MUESTRAS_RATING = 3;

/** Ventana estándar de la métrica: últimos 90 días corridos (REQ-5/BR-2). */
export const VENTANA_METRICA_DIAS = 90;

/**
 * Métrica de tiempo de respuesta de un vendedor. Es null cuando hay menos de
 * 3 conversaciones con respuesta en la ventana (REQ-5): la página la oculta.
 */
export type MetricaRespuesta = {
  promedioHoras: number;
  muestras: number;
} | null;

/**
 * Rating del vendedor (RF-24). Es null con menos de 3 muestras (o sin
 * Profile): el perfil oculta el bloque en ese caso.
 */
export type RatingVendedor = {
  promedio: number;
  cantidad: number;
} | null;

export type PerfilPublicoVendedor = {
  usuario: {
    id: string;
    name: string;
    image: string | null;
    locationLabel: string;
    createdAt: Date;
  };
  /** null si el vendedor no creó su Profile todavía (REQ-3). */
  profile: { bio: string | null; businessName: string | null } | null;
  metricaRespuesta: MetricaRespuesta;
  /** Rating agregado del vendedor: null si ratingCount < 3 (RF-24). */
  rating: RatingVendedor;
  publicaciones: Array<{
    id: string;
    title: string;
    price: Prisma.Decimal;
    currency: Currency;
    condition: ListingCondition;
    province: string;
    images: Array<{ url: string; alt: string | null }>;
  }>;
};

/**
 * Calcula el tiempo de respuesta típico del vendedor: el promedio, por
 * conversación, entre el primer mensaje del comprador y la primera respuesta
 * del vendedor en esa conversación (REQ-5/BR-2). La ventana (90 días
 * corridos por defecto) se aplica a la respuesta: respuestas fuera de la
 * ventana no cuentan. Se resuelve con una única agregación SQL usando
 * LATERAL, sin una query por conversación (REQ-11). Devuelve null si hay
 * menos de 3 conversaciones con respuesta (la página oculta la métrica).
 */
export async function calcularTiempoRespuestaPromedio(
  vendedorId: string,
  ventanaDias = VENTANA_METRICA_DIAS
): Promise<MetricaRespuesta> {
  const desde = new Date(Date.now() - ventanaDias * 24 * 60 * 60 * 1000);

  const filas = await prisma.$queryRaw<
    Array<{ muestras: number; promedioHoras: number | null }>
  >(Prisma.sql`
    SELECT COUNT(*)::int AS "muestras",
           AVG(EXTRACT(EPOCH FROM (sr."createdAt" - fb."createdAt")) / 3600.0)::float8 AS "promedioHoras"
    FROM (SELECT m."conversationId", MIN(m."createdAt") AS "createdAt"
          FROM "Message" m JOIN "Conversation" c ON c.id = m."conversationId"
          WHERE c."sellerId" = ${vendedorId} AND m."senderId" = c."buyerId"
          GROUP BY m."conversationId") fb
    JOIN LATERAL (SELECT m."createdAt" FROM "Message" m
                  WHERE m."conversationId" = fb."conversationId"
                    AND m."senderId" = ${vendedorId}
                    AND m."createdAt" >= ${desde} AND m."createdAt" > fb."createdAt"
                  ORDER BY m."createdAt" ASC LIMIT 1) sr ON true
  `);

  const fila = filas[0];
  if (!fila || fila.muestras < MINIMO_MUESTRAS_METRICA) {
    return null;
  }
  return { promedioHoras: fila.promedioHoras ?? 0, muestras: fila.muestras };
}

/**
 * Resuelve los datos del perfil público de un vendedor en un número acotado
 * de queries en paralelo (REQ-11, sin N+1): usuario + Profile opcional,
 * métrica de respuesta (una sola agregación SQL) y publicaciones activas con
 * stock. Devuelve null si el usuario no existe (la página responde 404,
 * REQ-1). Sin Profile, no se calcula ni se expone la métrica (REQ-3).
 */
export async function obtenerPerfilPublicoVendedor(
  vendedorId: string
): Promise<PerfilPublicoVendedor | null> {
  const usuario = await prisma.user.findUnique({
    where: { id: vendedorId },
    select: {
      id: true,
      name: true,
      image: true,
      locationLabel: true,
      createdAt: true,
      profile: {
        select: {
          bio: true,
          businessName: true,
          ratingAvg: true,
          ratingCount: true,
        },
      },
    },
  });

  if (!usuario) {
    return null;
  }

  const [metricaRespuesta, publicaciones] = await Promise.all([
    // Sin Profile la métrica no aplica (REQ-3): se evita la query.
    usuario.profile ? calcularTiempoRespuestaPromedio(vendedorId) : null,
    prisma.listing.findMany({
      where: {
        ownerId: vendedorId,
        status: "ACTIVE",
        stock: { gt: 0 },
        deletedAt: null,
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        condition: true,
        province: true,
        images: {
          orderBy: { position: "asc" as const },
          select: { url: true, alt: true },
        },
      },
    }),
  ]);

  // RF-24: el rating se expone solo con 3 o más muestras (patrón
  // MINIMO_MUESTRAS). Sin Profile o con menos reseñas → null (bloque oculto).
  const rating: RatingVendedor =
    usuario.profile && usuario.profile.ratingCount >= MINIMO_MUESTRAS_RATING
      ? {
          promedio: usuario.profile.ratingAvg,
          cantidad: usuario.profile.ratingCount,
        }
      : null;

  return {
    usuario: {
      id: usuario.id,
      name: usuario.name,
      image: usuario.image,
      locationLabel: usuario.locationLabel,
      createdAt: usuario.createdAt,
    },
    profile: usuario.profile
      ? {
          bio: usuario.profile.bio,
          businessName: usuario.profile.businessName,
        }
      : null,
    metricaRespuesta,
    rating,
    publicaciones,
  };
}

/**
 * Crea o actualiza el Profile del usuario autenticado (lazy upsert, REQ-9).
 * En el primer guardado crea el Profile con los valores enviados; en las
 * ediciones posteriores solo actualiza los campos presentes en el payload
 * (un campo ausente no pisa el valor guardado previamente).
 */
export async function actualizarMiPerfil(
  userId: string,
  datos: { bio?: string | null; businessName?: string | null }
): Promise<{ id: string; bio: string | null; businessName: string | null }> {
  const create = {
    userId,
    bio: datos.bio ?? null,
    businessName: datos.businessName ?? null,
  };
  const update = {
    ...(datos.bio !== undefined ? { bio: datos.bio } : {}),
    ...(datos.businessName !== undefined
      ? { businessName: datos.businessName }
      : {}),
  };

  return prisma.profile.upsert({
    where: { userId },
    create,
    update,
    select: { id: true, bio: true, businessName: true },
  });
}

/**
 * Devuelve bio y businessName del perfil propio para precargar el
 * formulario de edición. Si el Profile aún no existe, devuelve nulls.
 */
export async function obtenerMiPerfil(
  userId: string
): Promise<{ bio: string | null; businessName: string | null }> {
  const perfil = await prisma.profile.findUnique({
    where: { userId },
    select: { bio: true, businessName: true },
  });
  return perfil ?? { bio: null, businessName: null };
}

/**
 * Formatea el tiempo de respuesta típico (en horas) para mostrarlo en el
 * perfil público. Rangos: menos de 1 h, horas, días o semanas, siempre
 * redondeando hacia arriba para no decir menos de lo real.
 */
export function formatearTiempoRespuesta(horas: number): string {
  if (horas < 1) {
    return "< 1 h";
  }
  if (horas < 24) {
    return `~${Math.ceil(horas)} h`;
  }
  if (horas < 168) {
    const dias = Math.ceil(horas / 24);
    return dias === 1 ? "~1 día" : `~${dias} días`;
  }
  const semanas = Math.ceil(horas / 168);
  return semanas === 1 ? "~1 semana" : `~${semanas} semanas`;
}