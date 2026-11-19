import { waitUntil } from "@vercel/functions";

import type { NotificationTipo, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { enviarEmail } from "@/lib/email/enviar";
import { plantillaAviso } from "@/lib/email/plantillas";

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

/** Payload de venta paga al vendedor (tipo GENERAL, evento "pago_aprobado",
 * RF-45): se crea al confirmar un pago approved en el webhook. */
type PayloadPagoAprobado = {
  evento: "pago_aprobado";
  compraId: string;
  listingId: string;
  titulo: string;
  monto: string; // toFixed(2), RNF-19: escala de moneda normalizada
};

/** Payload de compra confirmada al comprador (tipo GENERAL, evento
 * "compra_confirmada", RF-23/RF-45): mismo dato que la venta, del otro lado. */
type PayloadCompraConfirmada = {
  evento: "compra_confirmada";
  compraId: string;
  listingId: string;
  titulo: string;
  monto: string;
};

/** Payload de una resolución de devolución (tipo GENERAL, evento
 * "devolucion", RF-49): informa al comprador/vendedor el estado de la
 * solicitud. */
type PayloadDevolucion = {
  evento: "devolucion";
  solicitudId: string;
  estado: string;
};

/** Payload posible de una notificación, discriminado por tipo. */
export type NotificacionPayload =
  | PayloadMensajeNuevo
  | PayloadFavoritoPrecio
  | PayloadFavoritoEstado
  | PayloadEstadoPublicacion
  | PayloadResenia
  | PayloadVerificacion
  | PayloadVinculacionMp
  | PayloadPagoAprobado
  | PayloadCompraConfirmada
  | PayloadDevolucion;

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

  const notificacion = await prisma.notification.create({
    data,
    select: { id: true, readAt: true },
  });

  // RF-20/RF-23: además de la bandeja, aviso por mail. Best-effort y en
  // segundo plano: nunca demora ni revierte la operación que notifica.
  try {
    waitUntil(
      enviarEmailNotificacion({
        id: notificacion.id,
        userId,
        listingId,
        titulo,
        mensaje,
        tipo,
        payload: payload ?? null,
      }).catch(() => false)
    );
  } catch {
    // Sin contexto de Vercel (scripts, tests): el mail se omite.
  }

  return notificacion;
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

function esPayloadPagoAprobado(objeto: Prisma.JsonObject): objeto is PayloadPagoAprobado {
  return (
    objeto.evento === "pago_aprobado" &&
    esCadena(objeto.compraId) &&
    esCadena(objeto.listingId) &&
    esCadena(objeto.titulo) &&
    esCadena(objeto.monto)
  );
}

function esPayloadCompraConfirmada(objeto: Prisma.JsonObject): objeto is PayloadCompraConfirmada {
  return (
    objeto.evento === "compra_confirmada" &&
    esCadena(objeto.compraId) &&
    esCadena(objeto.listingId) &&
    esCadena(objeto.titulo) &&
    esCadena(objeto.monto)
  );
}

function esPayloadDevolucion(objeto: Prisma.JsonObject): objeto is PayloadDevolucion {
  return (
    objeto.evento === "devolucion" &&
    esCadena(objeto.solicitudId) &&
    esCadena(objeto.estado)
  );
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
      if (esPayloadVinculacionMp(payload)) {
        return payload;
      }
      if (esPayloadPagoAprobado(payload)) {
        return payload;
      }
      if (esPayloadCompraConfirmada(payload)) {
        return payload;
      }
      return esPayloadDevolucion(payload) ? payload : null;
    default:
      return null;
  }
}

/**
 * Pantalla donde se actúa sobre una notificación, según su tipo y payload.
 * La usan la bandeja (/notificaciones) y los mails. Devuelve null si no hay
 * una pantalla específica.
 */
export function destinoNotificacion(notificacion: {
  tipo: NotificationTipo;
  payload: NotificacionPayload | null;
  listingId: string | null;
}): { href: string; etiqueta: string } | null {
  const { tipo, payload, listingId } = notificacion;

  if (tipo === "MENSAJE_NUEVO") {
    return payload && "conversationId" in payload
      ? { href: `/mensajes/${payload.conversationId}`, etiqueta: "Ver conversación" }
      : null;
  }

  if (tipo === "FAVORITO_CAMBIO_PRECIO" || tipo === "FAVORITO_CAMBIO_ESTADO" || tipo === "ESTADO_PUBLICACION") {
    // listingId del payload, con fallback a la relación (notificaciones legadas).
    const id = (payload && "listingId" in payload ? payload.listingId : null) ?? listingId;
    return id ? { href: `/listados/${id}`, etiqueta: "Ver publicación" } : null;
  }

  if (!payload || !("evento" in payload)) return null;
  switch (payload.evento) {
    case "devolucion":
      return payload.estado === "PENDIENTE"
        ? { href: "/perfil/devoluciones", etiqueta: "Revisar solicitud" }
        : { href: "/compras", etiqueta: "Ver mis compras" };
    case "verificacion":
      return { href: "/perfil/verificacion", etiqueta: "Ver verificación" };
    case "vinculacion_mp":
      return { href: "/perfil", etiqueta: "Volver a vincular Mercado Pago" };
    case "compra_confirmada":
      return { href: "/compras", etiqueta: "Ver mis compras" };
    default:
      return null;
  }
}

/** Ventana en la que no se repite el mail de mensajes de una misma conversación. */
export const VENTANA_EMAIL_MENSAJES_MS = 60 * 60_000;

function urlAbsoluta(ruta: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${ruta}`;
}

/**
 * Envía por mail una notificación recién creada (RF-20/RF-23). No se mandan
 * mails de cambios en favoritos (serían demasiados). Los mensajes de chat se
 * agrupan: si el usuario ya tiene otra notificación sin leer de la misma
 * conversación en la última hora, ya recibió el mail y no se repite.
 * Devuelve true si el proveedor aceptó el mail. Nunca lanza.
 */
export async function enviarEmailNotificacion(notificacion: {
  id: string;
  userId: string;
  listingId: string | null;
  titulo: string;
  mensaje: string;
  tipo: NotificationTipo;
  payload: NotificacionPayload | null;
}): Promise<boolean> {
  const { id, userId, tipo, payload } = notificacion;
  if (tipo === "FAVORITO_CAMBIO_PRECIO" || tipo === "FAVORITO_CAMBIO_ESTADO") {
    return false;
  }

  try {
    if (tipo === "MENSAJE_NUEVO" && payload && "conversationId" in payload) {
      const previasSinLeer = await prisma.notification.count({
        where: {
          userId,
          tipo: "MENSAJE_NUEVO",
          readAt: null,
          id: { not: id },
          createdAt: { gte: new Date(Date.now() - VENTANA_EMAIL_MENSAJES_MS) },
          payload: { path: ["conversationId"], equals: payload.conversationId },
        },
      });
      if (previasSinLeer > 0) {
        return false;
      }
    }

    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!usuario?.email) {
      return false;
    }

    // Mismo criterio que la bandeja: pantalla específica, si no el detalle
    // de la publicación, y si no la bandeja.
    const destino =
      destinoNotificacion(notificacion) ??
      (notificacion.listingId
        ? { href: `/listados/${notificacion.listingId}`, etiqueta: "Ver publicación" }
        : { href: "/notificaciones", etiqueta: "Ver mis notificaciones" });
    const contenido = plantillaAviso({
      nombre: usuario.name,
      titulo: notificacion.titulo,
      mensaje: notificacion.mensaje,
      url: urlAbsoluta(destino.href),
      textoBoton: destino.etiqueta,
    });
    return await enviarEmail({
      para: usuario.email,
      ...contenido,
      claveIdempotencia: `notificacion-${id}`,
    });
  } catch (error) {
    console.error("EMAIL_NOTIFICACION_FALLIDO", {
      tipo,
      error: error instanceof Error ? error.name : "desconocido",
    });
    return false;
  }
}
