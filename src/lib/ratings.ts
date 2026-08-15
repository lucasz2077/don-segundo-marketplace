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

/** Error de dominio: el pago de la compra no está aprobado. (409 COMPRA_NO_APROBADA) */
export class CompraNoAprobadaError extends Error {
  constructor() {
    super("Solo podés calificar compras con pago aprobado");
    this.name = "CompraNoAprobadaError";
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

/** Error de dominio: la reseña a eliminar no existe. (404 RESENIA_NO_ENCONTRADA) */
export class ReseniaNoEncontradaError extends Error {
  constructor() {
    super("La reseña no existe");
    this.name = "ReseniaNoEncontradaError";
  }
}

/** Error de dominio: la reseña pertenece a otro usuario. (403 SIN_PERMISO) */
export class ReseniaDeOtroUsuarioError extends Error {
  constructor() {
    super("No puedes eliminar una reseña que no es tuya");
    this.name = "ReseniaDeOtroUsuarioError";
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
 * una sola vez por compra (unique compraId), con el pago APROBADO (D9) y
 * dentro de los 30 días posteriores a la aprobación del pago (D9: la ventana
 * se ancla a `aprobadoAt`, no a `createdAt`). Dentro de la MISMA transacción
 * que crea el Rating:
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
  // D9 (6.6): solo se califican compras con pago APROBADO; una compra
  // aprobada sin `aprobadoAt` es dato corrupto y tampoco es calificable.
  const aprobadoAt = compra.aprobadoAt;
  if (compra.estadoPago !== "APROBADO" || !aprobadoAt) {
    throw new CompraNoAprobadaError();
  }

  const vendedorId = compra.listing.ownerId;
  const ventanaMs = VENTANA_CALIFICACION_DIAS * DIA_MS;
  // D9 (6.6): la ventana de 30 días arranca en la aprobación del pago
  // (`aprobadoAt`), no en la creación de la orden (`createdAt`).
  if (Date.now() - aprobadoAt.getTime() > ventanaMs) {
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

/**
 * Reseña pública de una publicación (RF-30). `autor` es el nombre del
 * comprador y `autorId` su id (para permitir al propio autor eliminar su
 * reseña desde la UI, RF-31).
 */
export type ResenaPublicacion = {
  id: string;
  puntaje: number;
  comentario: string | null;
  autor: string;
  autorId: string;
  fecha: Date;
};

/**
 * Lista las reseñas de una publicación (RF-30), de más reciente a más
 * antigua. No es un error no tener reseñas: devuelve [].
 */
export async function obtenerResenasDePublicacion(
  listingId: string
): Promise<ResenaPublicacion[]> {
  const resenas = await prisma.rating.findMany({
    where: { compra: { listingId } },
    select: {
      id: true,
      puntaje: true,
      comentario: true,
      createdAt: true,
      compradorId: true,
      comprador: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return resenas.map((resena) => ({
    id: resena.id,
    puntaje: resena.puntaje,
    comentario: resena.comentario,
    autor: resena.comprador.name ?? "Comprador",
    autorId: resena.compradorId,
    fecha: resena.createdAt,
  }));
}

/**
 * Elimina una reseña (RF-31). Solo el comprador autor puede borrar su propia
 * reseña. Dentro de la MISMA transacción revierte los agregados del vendedor
 * con el lock pesimista de calificarVenta (D3): si quedaba una sola reseña el
 * promedio vuelve a 0; si quedaban varias se resta el puntaje del promedio
 * ponderado. Sin notificación al borrar (best-effort no aplica aquí).
 */
export async function eliminarResenia({
  ratingId,
  compradorId,
}: {
  ratingId: string;
  compradorId: string;
}): Promise<{ eliminado: true }> {
  return prisma.$transaction(async (tx) => {
    const rating = await tx.rating.findUnique({
      where: { id: ratingId },
      select: {
        compradorId: true,
        puntaje: true,
        compra: {
          select: {
            listing: { select: { ownerId: true, title: true } },
          },
        },
      },
    });

    if (!rating) {
      throw new ReseniaNoEncontradaError();
    }
    if (rating.compradorId !== compradorId) {
      throw new ReseniaDeOtroUsuarioError();
    }

    const vendedorId = rating.compra.listing.ownerId;

    // Replica el lock pesimista de calificarVenta (D3): sin él, dos borrados
    // concurrentes de reseñas del mismo vendedor partirían del mismo
    // ratingCount y perderían una reversión (lost update).
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

    await tx.rating.delete({ where: { id: ratingId } });

    const cantidadPrevia = perfil ? perfil.ratingCount : 0;
    const promedioPrevio = perfil ? perfil.ratingAvg : 0;
    const esUltimaResenia = cantidadPrevia <= 1;

    let cantidadNueva = 0;
    let promedioNuevo = 0;
    if (!esUltimaResenia) {
      cantidadNueva = cantidadPrevia - 1;
      const promedioCrudo =
        (promedioPrevio * cantidadPrevia - rating.puntaje) / cantidadNueva;
      // Nunca dejar el promedio por debajo de 0 (correcto por construcción,
      // pero se defiende del redondeo) y redondear a 2 decimales.
      promedioNuevo = Math.max(0, Math.round(promedioCrudo * 100) / 100);
    }

    await tx.profile.upsert({
      where: { userId: vendedorId },
      create: {
        userId: vendedorId,
        ratingAvg: promedioNuevo,
        ratingCount: cantidadNueva,
      },
      update: {
        ratingAvg: promedioNuevo,
        ratingCount: cantidadNueva,
      },
      select: { id: true },
    });

    return { eliminado: true };
  });
}
