import type { NotificationTipo, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/** Cantidad de notificaciones por página en la bandeja del usuario. */
export const TAMANIO_PAGINACION_NOTIFICACIONES = 20;

export type EstadoCambioPublicacion = "pausada" | "rechazada" | "vendida";

/** Payload de una notificación de mensaje nuevo (tipo MENSAJE_NUEVO). */
type PayloadMensajeNuevo = {
  conversationId: string;
  mensajeId: string;
  emisorNombre: string;
  preview: string;
};

/** Payload de un cambio de precio en una publicación favorita. */
type PayloadFavoritoPrecio = {
  listingId: string;
  titulo: string;
  precioAnterior: string;
  precioNuevo: string;
};

/** Payload de un cambio de estado en una publicación favorita. */
type PayloadFavoritoEstado = {
  listingId: string;
  titulo: string;
  estadoAnterior: string;
  estadoNuevo: string;
};

/** Payload de un cambio de estado en una publicación propia. */
type PayloadEstadoPublicacion = {
  listingId: string;
  estado: string;
};

/** Payload de una reseña de venta (tipo GENERAL, evento "resenia", RF-27). */
type PayloadResenia = {
  evento: "resenia";
  compraId: string;
  listingId: string;
  puntaje: number;
  autorNombre: string;
};

/** Payload de una notificación de verificación de vendedor (tipo GENERAL,
 * evento "verificacion", RF-32..RF-36). Refleja el estado de Profile. */
type PayloadVerificacion = {
  evento: "verificacion";
  estado: "PENDING" | "APPROVED" | "REJECTED";
};

/** Payload de revocación del vínculo con Mercado Pago (tipo GENERAL, evento
 * "vinculacion_mp", RF-48): avisa al vendedor que debe re-vincular su cuenta. */
type PayloadVinculacionMp = {
  evento: "vinculacion_mp";
  estado: "REVOCADA";
};

/** Payload posible de una notificación, discriminado por tipo. */
export type NotificacionPayload =
  | PayloadMensajeNuevo
  | PayloadFavoritoPrecio
  | PayloadFavoritoEstado
  | PayloadEstadoPublicacion
  | PayloadResenia
  | PayloadVerificacion
  | PayloadVinculacionMp;

const titulosEstadoCambio: Record<EstadoCambioPublicacion, string> = {
  pausada: "Publicación pausada",
  rechazada: "Publicación rechazada",
  vendida: "Publicación vendida",
};

const mensajeEstadoCambio: Record<EstadoCambioPublicacion, string> = {
  pausada: "fue pausada por un administrador",
  rechazada: "fue rechazada por un administrador",
  vendida: "se agotó y quedó marcada como vendida",
};

/** Estado de la publicación según la variante de notificación al dueño. */
const estadoPublicacionPorCambio: Record<EstadoCambioPublicacion, "PAUSED" | "REJECTED" | "SOLD"> = {
  pausada: "PAUSED",
  rechazada: "REJECTED",
  vendida: "SOLD",
};

/** Trunca un texto a ~120 caracteres para el body de la notificación. */
function truncarPreview(texto: string, maximo = 120): string {
  const limpio = texto.trim();
  if (limpio.length <= maximo) {
    return limpio;
  }
  return `${limpio.slice(0, maximo - 3)}...`;
}

/**
 * Crea una notificación para un usuario con su título, mensaje y la
 * publicación de referencia (opcional). Se guarda sin leer (readAt null).
 * Acepta el tipo de notificación y un payload opcional tipado; las
 * notificaciones legadas quedan como GENERAL sin payload.
 */
export async function crearNotificacion(
  userId: string,
  listingId: string | null,
  titulo: string,
  mensaje: string,
  tipo: NotificationTipo = "GENERAL",
  payload?: NotificacionPayload | null
) {
  const data: Prisma.NotificationUncheckedCreateInput = {
    userId,
    listingId,
    title: titulo,
    body: mensaje,
    tipo,
  };
  if (payload !== null && payload !== undefined) {
    data.payload = payload as Prisma.InputJsonValue;
  }

  return prisma.notification.create({
    data,
    select: { id: true, readAt: true },
  });
}

/**
 * Notifica al receptor cuando llega un mensaje nuevo en una conversación
 * (tipo MENSAJE_NUEVO). El body usa el preview truncado del mensaje para
 * mantenerse legible en la bandeja.
 */
export async function notificarMensajeNuevo(
  receptorId: string,
  datos: {
    conversationId: string;
    mensajeId: string;
    emisorNombre: string;
    preview: string;
    listingId?: string | null;
  }
) {
  return crearNotificacion(
    receptorId,
    datos.listingId ?? null,
    `Nuevo mensaje de ${datos.emisorNombre}`,
    truncarPreview(datos.preview),
    "MENSAJE_NUEVO",
    {
      conversationId: datos.conversationId,
      mensajeId: datos.mensajeId,
      emisorNombre: datos.emisorNombre,
      preview: datos.preview,
    }
  );
}

/**
 * Crea la notificación dirigida al dueño cuando un administrador pausa o
 * rechaza su publicación (tipo ESTADO_PUBLICACION). El mensaje usa el título
 * real de la publicación cuando está disponible, con un texto de respaldo si
 * no se pudo leer.
 */
export async function notificarCambioEstadoPublicacion(
  ownerId: string,
  listingId: string,
  titulo: string | null,
  estado: EstadoCambioPublicacion
) {
  const tituloNotificacion = titulosEstadoCambio[estado];
  const mensajeNotificacion = titulo
    ? `Tu publicación "${titulo}" ${mensajeEstadoCambio[estado]}.`
    : `Tu publicación ${mensajeEstadoCambio[estado]}.`;

  return crearNotificacion(
    ownerId,
    listingId,
    tituloNotificacion,
    mensajeNotificacion,
    "ESTADO_PUBLICACION",
    { listingId, estado: estadoPublicacionPorCambio[estado] }
  );
}

/**
 * Notifica a todos los usuarios que tienen como favorita una publicación
 * cuando esta cambia de precio o de estado (tipo FAVORITO_CAMBIO_PRECIO /
 * FAVORITO_CAMBIO_ESTADO). Excluye al dueño de la publicación. Retorna la
 * cantidad de notificaciones creadas; si no hay favoritos, retorna 0.
 */
export async function notificarFavoritosCambioPublicacion(
  listingId: string,
  tipo: "FAVORITO_CAMBIO_PRECIO" | "FAVORITO_CAMBIO_ESTADO",
  payload: PayloadFavoritoPrecio | PayloadFavoritoEstado,
  titulo: string,
  mensaje: string
) {
  const favoritos = await prisma.favorite.findMany({
    where: { listingId },
    select: { userId: true, listing: { select: { ownerId: true } } },
  });

  const receptores = favoritos
    .filter((favorito) => favorito.userId !== favorito.listing.ownerId)
    .map((favorito) => favorito.userId);

  if (receptores.length === 0) {
    return 0;
  }

  const resultados = await Promise.allSettled(
    receptores.map((userId) =>
      prisma.notification.create({
        data: {
          userId,
          listingId,
          title: titulo,
          body: mensaje,
          tipo,
          // El union de payloads tipados es serializable como JSON.
          payload: payload as Prisma.InputJsonValue,
        },
        select: { id: true },
      })
    )
  );

  return resultados.filter((resultado) => resultado.status === "fulfilled").length;
}

/**
 * Lista las notificaciones del usuario, de la más reciente a la más antigua,
 * con paginación simple (20 por página). Incluye el estado de la publicación
 * de referencia para saber si el enlace al detalle sigue disponible.
 * Sin N+1: una única query con include.
 */
export async function obtenerNotificaciones(
  userId: string,
  pagina = 1
) {
  const paginaActual = Math.max(1, pagina);

  const [notificaciones, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (paginaActual - 1) * TAMANIO_PAGINACION_NOTIFICACIONES,
      take: TAMANIO_PAGINACION_NOTIFICACIONES,
      include: {
        listing: {
          select: { id: true, title: true },
        },
      },
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return {
    notificaciones,
    total,
    pagina: paginaActual,
    tamanioPagina: TAMANIO_PAGINACION_NOTIFICACIONES,
    totalPaginas: Math.max(1, Math.ceil(total / TAMANIO_PAGINACION_NOTIFICACIONES)),
  };
}

/**
 * Cuenta las notificaciones sin leer (readAt null) de un usuario, para el
 * badge de la navegación.
 */
export function contarNoLeidas(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

/**
 * Marca como leídas todas las notificaciones de un usuario (al ingresar a su
 * bandeja). Retorna la cantidad de notificaciones actualizadas.
 */
export async function marcarNotificacionesLeidas(userId: string) {
  const resultado = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return resultado.count;
}

function esObjetoJson(
  valor: Prisma.JsonValue | null | undefined
): valor is Prisma.JsonObject {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esCadena(valor: Prisma.JsonValue | undefined): valor is string {
  return typeof valor === "string";
}

function esPayloadMensajeNuevo(objeto: Prisma.JsonObject): objeto is PayloadMensajeNuevo {
  return (
    esCadena(objeto.conversationId) &&
    esCadena(objeto.mensajeId) &&
    esCadena(objeto.emisorNombre) &&
    esCadena(objeto.preview)
  );
}

function esPayloadFavoritoPrecio(objeto: Prisma.JsonObject): objeto is PayloadFavoritoPrecio {
  return (
    esCadena(objeto.listingId) &&
    esCadena(objeto.titulo) &&
    esCadena(objeto.precioAnterior) &&
    esCadena(objeto.precioNuevo)
  );
}

function esPayloadFavoritoEstado(objeto: Prisma.JsonObject): objeto is PayloadFavoritoEstado {
  return (
    esCadena(objeto.listingId) &&
    esCadena(objeto.titulo) &&
    esCadena(objeto.estadoAnterior) &&
    esCadena(objeto.estadoNuevo)
  );
}

function esPayloadEstadoPublicacion(objeto: Prisma.JsonObject): objeto is PayloadEstadoPublicacion {
  return esCadena(objeto.listingId) && esCadena(objeto.estado);
}

function esPayloadResenia(objeto: Prisma.JsonObject): objeto is PayloadResenia {
  return (
    objeto.evento === "resenia" &&
    esCadena(objeto.compraId) &&
    esCadena(objeto.listingId) &&
    typeof objeto.puntaje === "number" &&
    esCadena(objeto.autorNombre)
  );
}

function esPayloadVerificacion(objeto: Prisma.JsonObject): objeto is PayloadVerificacion {
  return (
    objeto.evento === "verificacion" &&
    (objeto.estado === "PENDING" ||
      objeto.estado === "APPROVED" ||
      objeto.estado === "REJECTED")
  );
}

function esPayloadVinculacionMp(objeto: Prisma.JsonObject): objeto is PayloadVinculacionMp {
  return objeto.evento === "vinculacion_mp" && objeto.estado === "REVOCADA";
}

/**
 * Convierte el payload JSON (JsonValue de Prisma) de una notificación en un
 * payload tipado según su tipo. Devuelve null si no se puede parsear (por
 * ejemplo, un payload inesperado o de una notificación legada), nunca lanza.
 */
export function parsearPayload(
  tipo: NotificationTipo,
  payload: Prisma.JsonValue | null
): NotificacionPayload | null {
  if (!esObjetoJson(payload)) {
    return null;
  }

  switch (tipo) {
    case "MENSAJE_NUEVO":
      return esPayloadMensajeNuevo(payload) ? payload : null;
    case "FAVORITO_CAMBIO_PRECIO":
      return esPayloadFavoritoPrecio(payload) ? payload : null;
    case "FAVORITO_CAMBIO_ESTADO":
      return esPayloadFavoritoEstado(payload) ? payload : null;
    case "ESTADO_PUBLICACION":
      return esPayloadEstadoPublicacion(payload) ? payload : null;
    // Las reseñas de venta y las verificaciones de vendedor usan tipo GENERAL
    // con los eventos "resenia" y "verificacion" en el payload (RF-27, RF-32);
    // los payloads GENERAL legados sin esos eventos devuelven null, sin regresión.
    case "GENERAL":
      if (esPayloadResenia(payload)) {
        return payload;
      }
      if (esPayloadVerificacion(payload)) {
        return payload;
      }
      return esPayloadVinculacionMp(payload) ? payload : null;
    default:
      return null;
  }
}

/**
 * Stub de envío de email de notificación. Por decisión del dueño la entrega
 * es únicamente en plataforma; el email queda diferido (no hay SMTP ni
 * proveedor configurado). Se exporta como punto de integración documentado
 * para una fase futura; no se invoca desde los flujos de creación.
 */
export async function enviarEmailNotificacion(notificacion: {
  userId: string;
  title: string;
  body: string;
  tipo: NotificationTipo;
}): Promise<void> {
  void notificacion;
  // TODO(email): integrar proveedor (Resend/SMTP) — decisión: email diferido.
  return;
}