import { prisma } from "@/lib/db/prisma";
import type { DireccionInput } from "@/lib/validation/direccion";

/**
 * Lista las direcciones de un usuario, más recientes primero.
 */
export async function obtenerDirecciones(userId: string) {
  return prisma.direccion.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Crea una dirección. Garantiza el invariante de única predeterminada por
 * usuario: la primera dirección queda predeterminada aunque no se marque, y
 * cualquier dirección marcada como predeterminada deja sin marcar a las
 * demás. Todo se resuelve en una transacción.
 */
export async function crearDireccion(userId: string, datos: DireccionInput) {
  return prisma.$transaction(async (tx) => {
    const cantidad = await tx.direccion.count({ where: { userId } });
    const esPredeterminada = datos.esPredeterminada || cantidad === 0;
    if (esPredeterminada) {
      await tx.direccion.updateMany({
        where: { userId },
        data: { esPredeterminada: false },
      });
    }
    return tx.direccion.create({
      data: { ...datos, esPredeterminada, userId },
    });
  });
}

/**
 * Actualiza una dirección si pertenece al usuario. Mantiene el invariante de
 * única predeterminada: si se marca como predeterminada, las demás quedan sin
 * marcar; si se quita la marca pero no queda ninguna otra predeterminada, la
 * dirección conserva su rol de predeterminada. Retorna null si no existe o no
 * pertenece al usuario.
 */
export async function actualizarDireccion(
  id: string,
  userId: string,
  datos: DireccionInput
) {
  return prisma.$transaction(async (tx) => {
    const existente = await tx.direccion.findFirst({ where: { id, userId } });
    if (!existente) {
      return null;
    }

    let esPredeterminada = datos.esPredeterminada;
    if (existente.esPredeterminada && !esPredeterminada) {
      const otras = await tx.direccion.count({
        where: { userId, id: { not: id } },
      });
      // Nunca dejar al usuario sin una dirección predeterminada si es única.
      if (otras === 0) {
        esPredeterminada = true;
      }
    }
    if (esPredeterminada) {
      await tx.direccion.updateMany({
        where: { userId, id: { not: id } },
        data: { esPredeterminada: false },
      });
    }

    return tx.direccion.update({
      where: { id },
      data: { ...datos, esPredeterminada },
    });
  });
}

/**
 * Elimina una dirección del usuario. Devuelve true si existía y fue eliminada,
 * false si no existía (comportamiento idempotente en el DELETE).
 */
export async function eliminarDireccion(id: string, userId: string) {
  const resultado = await prisma.direccion.deleteMany({
    where: { id, userId },
  });
  return resultado.count > 0;
}