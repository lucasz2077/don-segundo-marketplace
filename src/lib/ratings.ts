import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { crearNotificacion } from "@/lib/notificaciones";

/** Ventana de calificación de una compra: 30 días corridos (RF-27). */
export const VENTANA_CALIFICACION_DIAS = 30;

const DIA_MS = 24 * 60 * 60 * 1000;

/** Error de dominio: la compra a calificar no existe. (404 COMPRA_NO_ENCONTRADA) */
export class CompraNoEncontradaError extends Error {
  constructor() {
    super("La compra no existe");
    this.name = "CompraNoEncontradaError";
  }
}

/** Error de dominio: la compra pertenece a otro usuario. (403 SIN_PERMISO) */
export class CompraDeOtroUsuarioError extends Error {
  constructor() {
    super("No podés calificar una compra que no es tuya");
    this.name = "CompraDeOtroUsuarioError";
  }
}

/** Error de dominio: la compra superó la ventana de 30 días. (410 VENTANA_EXPIRADA) */
export class VentanaExpiradaError extends Error {
  constructor() {
    super("La ventana de calificación de 30 días ya venció");
    this.name = "VentanaExpiradaError";
  }
}

/** Error de dominio: la compra ya fue calificada. (409 YA_CALIFICADA) */
export class YaCalificadaError extends Error {
  constructor() {
    super("Esta compra ya fue calificada");
    this.name = "YaCalificadaError";
  }
}

function esErrorClaveDuplicada(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Califica una venta (RF-27). Solo el comprador de la Compra puede calificar,
 * una sola vez por compra (unique compraId) y dentro de los 30 días
 * posteriores a la compra. Dentro de la MISMA transacción que crea el Rating:
 * - D3: bloquea el Profile del vendedor con SELECT ... FOR UPDATE (serializa
 *   escritores concurrentes del mismo vendedor) y recalcula los agregados con
 *   el promedio ponderado (ratingAvg * ratingCount + puntaje) / (count + 1).
 *   El upsert cubre al vendedor sin Profile (primer rating → count 1).
 * - D4: errores tipados de dominio; un unique violado en el create (doble
 *   POST concurrente) se traduce a YaCalificadaError.
 * La notificación al vendedor corre FUERA de la tx (D5, best-effort): un
 * fallo de notificación nunca revierte el rating. Retorna el rating creado.
 */
export async function calificarVenta({
  compradorId,
  compraId,
  puntaje,
  comentario,
}: {
  compradorId: string;
  compraId: string;
  puntaje: number;
  comentario?: string | null;
}) {
  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    include: {
      comprador: { select: { name: true } },
      listing: { select: { id: true, ownerId: true, title: true } },
    },
  });

  if (!compra) {
    throw new CompraNoEncontradaError();
  }
  if (compra.compradorId !== compradorId) {
    throw new CompraDeOtroUsuarioError();
  }

  const vendedorId = compra.listing.ownerId;
  const ventanaMs = VENTANA_CALIFICACION_DIAS * DIA_MS;
  if (Date.now() - compra.createdAt.getTime() > ventanaMs) {
    throw new VentanaExpiradaError();
  }

  // El comentario vacío o solo espacios se guarda como null (RF-27).
  const comentarioFinal =
    comentario != null && comentario.trim() !== "" ? comentario.trim() : null;

  const rating = await prisma.$transaction(async (tx) => {
    // D3: lock pesimista del Profile del vendedor. Sin el lock, dos reseñas
    // concurrentes del mismo vendedor leerían el mismo ratingCount y perderían
    // una actualización (lost update). $queryRaw es el único camino de row
    // locking en Prisma; el upsert posterior cubre al vendedor sin Profile.
    const perfiles = await tx.$queryRaw<
      Array<{ userId: string; ratingAvg: number; ratingCount: number }>
    >(
      Prisma.sql`
        SELECT "userId", "ratingAvg", "ratingCount"
        FROM "Profile"
        WHERE "userId" = ${vendedorId}
        FOR UPDATE
      `
    );
    const perfil = perfiles[0];

    let rating;
    try {
      rating = await tx.rating.create({
        data: {
          compradorId,
          vendedorId,
          compraId,
          puntaje,
          comentario: comentarioFinal,
        },
        select: { id: true, puntaje: true },
      });
    } catch (error) {
      // Backstop de concurrencia (D4): el unique compraId impide la doble
      // calificación aunque dos requests entren a la vez.
      if (esErrorClaveDuplicada(error)) {
        throw new YaCalificadaError();
      }
      throw error;
    }

    const cantidadPrevia = perfil ? perfil.ratingCount : 0;
    const promedioPrevio = perfil ? perfil.ratingAvg : 0;
    const cantidadNueva = cantidadPrevia + 1;
    const promedioNuevo =
      (promedioPrevio * cantidadPrevia + puntaje) / cantidadNueva;

    await tx.profile.upsert({
      where: { userId: vendedorId },
      create: {
        userId: vendedorId,
        ratingAvg: puntaje,
        ratingCount: 1,
      },
      update: {
        ratingCount: { increment: 1 },
        ratingAvg: promedioNuevo,
      },
      select: { id: true },
    });

    return rating;
  });

  // D5: notificación al vendedor FUERA de la tx (best-effort post-commit).
  // Se usa tipo GENERAL con payload tipado de reseña (sin migrar el enum).
  try {
    await crearNotificacion(
      vendedorId,
      compra.listingId,
      "Nueva reseña",
      `${compra.comprador.name} calificó tu publicación "${compra.listing.title}" con ${puntaje} estrellas.`,
      "GENERAL",
      {
        evento: "resenia",
        compraId,
        listingId: compra.listingId,
        puntaje,
        autorNombre: compra.comprador.name,
      }
    );
  } catch {
    // La notificación es complementaria: se ignora el error silenciosamente.
  }

  return { id: rating.id, puntaje: rating.puntaje };
}