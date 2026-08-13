import { prisma } from "@/lib/db/prisma";

/** Error de dominio: el usuario no participa de la conversación. */
export class NoParticipanteError extends Error {
  constructor() {
    super("No tenés acceso a esta conversación");
    this.name = "NoParticipanteError";
  }
}

/** Error de dominio: la publicación referida no está disponible para contactarse. */
export class PublicacionNoDisponibleError extends Error {
  constructor() {
    super("La publicación no está disponible");
    this.name = "PublicacionNoDisponibleError";
  }
}

/** Error de dominio: el comprador intenta contactar su propia publicación. */
export class AutoContactoError extends Error {
  constructor() {
    super("No podés contactarte con tu propia publicación");
    this.name = "AutoContactoError";
  }
}

const seleccionUsuarioConversacion = {
  select: { id: true, name: true, image: true },
} as const;

const seleccionPropietario = { id: true, name: true } as const;

/** Select de un mensaje con su remitente, igual al que usa el detalle. */
const seleccionMensajeDetalle = {
  id: true,
  senderId: true,
  body: true,
  readAt: true,
  createdAt: true,
  sender: { select: { id: true, name: true, image: true } },
} as const;

/**
 * Include completo de una conversación para el detalle: publicación con
 * imágenes ordenadas y dueño, comprador, vendedor y todos sus mensajes con el
 * remitente (útil para confirmar identidad visual en el chat).
 */
const incluirDependenciasConversacion = {
  listing: {
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      status: true,
      owner: { select: seleccionPropietario },
      images: { orderBy: { position: "asc" as const } },
    },
  },
  buyer: seleccionUsuarioConversacion,
  seller: seleccionUsuarioConversacion,
  messages: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      senderId: true,
      body: true,
      readAt: true,
      createdAt: true,
      sender: { select: { id: true, name: true, image: true } },
    },
  },
} as const;

/**
 * Resumen de una conversación para la lista de mensajes: incluye el último
 * mensaje (para el preview) y solo la imagen principal de la publicación.
 */
const incluirResumenConversacion = {
  listing: {
    select: {
      id: true,
      title: true,
      images: {
        orderBy: { position: "asc" as const },
        take: 1,
        select: { url: true },
      },
    },
  },
  buyer: seleccionUsuarioConversacion,
  seller: seleccionUsuarioConversacion,
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      senderId: true,
      body: true,
      readAt: true,
      createdAt: true,
    },
  },
} as const;

export type ConversacionResumen = {
  id: string;
  listingId: string;
  listingTitulo: string;
  listingImagen: string | null;
  otroParticipante: { id: string; name: string; image: string | null };
  ultimoMensaje: {
    senderId: string;
    body: string;
    readAt: Date | null;
    createdAt: Date;
  } | null;
  noLeidos: number;
  lastMessageAt: Date | null;
  createdAt: Date;
  /** Rol del usuario en la conversación ("comprador" o "vendedor"). */
  rol: "comprador" | "vendedor";
};

/**
 * Lista las conversaciones donde el usuario participa (como comprador o
 * vendedor), ordenadas por el último mensaje (más recientes primero). Para
 * cada conversación devuelve la publicación, el otro participante, el último
 * mensaje y la cantidad de mensajes no leídos. Evita N+1: usa una única query
 * para contar los no leídos de todas las conversaciones del usuario.
 */
export async function obtenerConversacionesDeUsuario(
  userId: string
): Promise<ConversacionResumen[]> {
  const conversaciones = await prisma.conversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    orderBy: [
      { lastMessageAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    include: incluirResumenConversacion,
  });

  const mensajesNoLeidos = await prisma.message.findMany({
    where: {
      conversationId: { in: conversaciones.map((conversacion) => conversacion.id) },
      senderId: { not: userId },
      readAt: null,
    },
    select: { conversationId: true },
  });

  const noLeidosPorConversacion = new Map<string, number>();
  for (const mensaje of mensajesNoLeidos) {
    noLeidosPorConversacion.set(
      mensaje.conversationId,
      (noLeidosPorConversacion.get(mensaje.conversationId) ?? 0) + 1
    );
  }

  return conversaciones.map((conversacion) => {
    const otroParticipante =
      conversacion.buyerId === userId ? conversacion.seller : conversacion.buyer;
    return {
      id: conversacion.id,
      listingId: conversacion.listing.id,
      listingTitulo: conversacion.listing.title,
      listingImagen: conversacion.listing.images[0]?.url ?? null,
      otroParticipante: {
        id: otroParticipante.id,
        name: otroParticipante.name,
        image: otroParticipante.image,
      },
      ultimoMensaje: conversacion.messages[0] ?? null,
      noLeidos: noLeidosPorConversacion.get(conversacion.id) ?? 0,
      lastMessageAt: conversacion.lastMessageAt,
      createdAt: conversacion.createdAt,
      rol: conversacion.buyerId === userId ? "comprador" : "vendedor",
    };
  });
}

/**
 * Devuelve el detalle de una conversación con sus mensajes, pero solo si el
 * usuario participa de ella (como comprador o vendedor). Retorna null si no
 * existe o si el usuario no es participante.
 */
export async function obtenerConversacionDetalle(
  conversacionId: string,
  userId: string
) {
  const conversacion = await prisma.conversation.findFirst({
    where: {
      id: conversacionId,
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    include: incluirDependenciasConversacion,
  });

  if (!conversacion) {
    return null;
  }

  const otroParticipante =
    conversacion.buyerId === userId ? conversacion.seller : conversacion.buyer;

  return {
    ...conversacion,
    otroParticipante: {
      id: otroParticipante.id,
      name: otroParticipante.name,
      image: otroParticipante.image,
    },
  };
}

/**
 * Devuelve los mensajes nuevos de una conversación (createdAt > despuesDe)
 * ordenados asc, junto con los ids de los mensajes enviados por el usuario que
 * ya fueron leídos por la otra parte. Soporta el polling incremental del chat
 * (Slice 2): como el cursor solo trae mensajes nuevos, los propios antiguos
 * nunca vuelven por el cursor; `leidosAhora` permite pintar la tilde de leído
 * sin re-descargar el historial. Lanza NoParticipanteError si el usuario no
 * participa de la conversación.
 */
export async function obtenerMensajesNuevos(
  conversacionId: string,
  userId: string,
  despuesDe: Date
) {
  const conversacion = await prisma.conversation.findFirst({
    where: {
      id: conversacionId,
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    select: { id: true },
  });
  if (!conversacion) {
    throw new NoParticipanteError();
  }

  const [mensajes, leidos] = await Promise.all([
    prisma.message.findMany({
      where: {
        conversationId: conversacionId,
        createdAt: { gt: despuesDe },
      },
      orderBy: { createdAt: "asc" as const },
      select: seleccionMensajeDetalle,
    }),
    prisma.message.findMany({
      where: {
        conversationId: conversacionId,
        senderId: userId,
        readAt: { not: null },
      },
      select: { id: true },
    }),
  ]);

  return {
    mensajes,
    leidosAhora: leidos.map((mensaje) => mensaje.id),
  };
}

/**
 * Crea una conversación (o reutiliza una existente) entre el comprador y el
 * dueño de la publicación, con el primer mensaje como parte de la misma
 * transacción. Rechaza el contacto con publicaciones no activas o propias.
 * Retorna la conversación y el mensaje creado.
 */
export async function crearConversacionOMensaje(
  buyerId: string,
  listingId: string,
  mensajeBody: string
) {
  const publicacion = await prisma.listing.findFirst({
    where: {
      id: listingId,
      status: "ACTIVE",
      deletedAt: null,
    },
    select: { id: true, ownerId: true },
  });
  if (!publicacion) {
    throw new PublicacionNoDisponibleError();
  }
  if (publicacion.ownerId === buyerId) {
    throw new AutoContactoError();
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const conversacion = await tx.conversation.upsert({
      where: {
        listingId_buyerId_sellerId: {
          listingId,
          buyerId,
          sellerId: publicacion.ownerId,
        },
      },
      create: {
        listingId,
        buyerId,
        sellerId: publicacion.ownerId,
        lastMessageAt: now,
      },
      update: { lastMessageAt: now },
    });

    const mensaje = await tx.message.create({
      data: {
        conversationId: conversacion.id,
        senderId: buyerId,
        body: mensajeBody,
      },
      include: { sender: { select: { id: true, name: true, image: true } } },
    });

    return { conversacion, mensaje };
  });
}

/**
 * Envía un mensaje en una conversación existente. Valida que el usuario
 * participe y que la publicación siga activa. Actualiza lastMessageAt dentro
 * de la misma transacción. Retorna el mensaje creado.
 */
export async function enviarMensaje(
  conversacionId: string,
  userId: string,
  mensajeBody: string
) {
  const conversacion = await prisma.conversation.findFirst({
    where: {
      id: conversacionId,
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    select: { id: true, listingId: true },
  });
  if (!conversacion) {
    throw new NoParticipanteError();
  }

  const publicacion = await prisma.listing.findFirst({
    where: {
      id: conversacion.listingId,
      status: "ACTIVE",
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!publicacion) {
    throw new PublicacionNoDisponibleError();
  }

  return prisma.$transaction(async (tx) => {
    const mensaje = await tx.message.create({
      data: {
        conversationId: conversacionId,
        senderId: userId,
        body: mensajeBody,
      },
      include: { sender: { select: { id: true, name: true, image: true } } },
    });

    await tx.conversation.update({
      where: { id: conversacionId },
      data: { lastMessageAt: new Date() },
    });

    return mensaje;
  });
}

/**
 * Marca como leídos los mensajes de la conversación que envió la otra parte.
 * Devuelve false si el usuario no participa de la conversación.
 */
export async function marcarConversacionLeida(
  conversacionId: string,
  userId: string
) {
  const conversacion = await prisma.conversation.findFirst({
    where: {
      id: conversacionId,
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    select: { id: true },
  });
  if (!conversacion) {
    return false;
  }

  await prisma.message.updateMany({
    where: {
      conversationId: conversacionId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return true;
}

/**
 * Cuenta los mensajes sin leer del usuario en todas sus conversaciones
 * (como comprador o vendedor), excluyendo sus propios envíos.
 */
export async function contarNoLeidos(userId: string) {
  return prisma.message.count({
    where: {
      readAt: null,
      senderId: { not: userId },
      conversation: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    },
  });
}