import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listingFindFirst: vi.fn(),
  conversationFindFirst: vi.fn(),
  conversationFindUnique: vi.fn(),
  conversationCount: vi.fn(),
  messageCount: vi.fn(),
  transaction: vi.fn(),
  notificarMensajeNuevo: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    listing: { findFirst: mocks.listingFindFirst },
    conversation: {
      findFirst: mocks.conversationFindFirst,
      findUnique: mocks.conversationFindUnique,
      count: mocks.conversationCount,
    },
    message: { count: mocks.messageCount },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/notificaciones", () => ({
  notificarMensajeNuevo: mocks.notificarMensajeNuevo,
}));

import {
  crearConversacionOMensaje,
  enviarMensaje,
  LIMITE_CONVERSACIONES_NUEVAS_POR_DIA,
  LIMITE_MENSAJES_POR_MINUTO,
  LimiteMensajesError,
} from "@/lib/conversaciones";

const mensajeCreado = { id: "msg-1", sender: { id: "comprador-1", name: "Ana", image: null } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listingFindFirst.mockResolvedValue({ id: "lista-1", ownerId: "vendedor-1" });
  mocks.conversationFindFirst.mockResolvedValue({
    id: "conv-1",
    listingId: "lista-1",
    buyerId: "comprador-1",
    sellerId: "vendedor-1",
  });
  mocks.conversationFindUnique.mockResolvedValue(null);
  mocks.conversationCount.mockResolvedValue(0);
  mocks.messageCount.mockResolvedValue(0);
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn({
      conversation: {
        upsert: vi.fn().mockResolvedValue({ id: "conv-1" }),
        update: vi.fn().mockResolvedValue({}),
      },
      message: { create: vi.fn().mockResolvedValue(mensajeCreado) },
    })
  );
});

describe("Límite de mensajes contado en la base (RNF-07)", () => {
  it("enviarMensaje rechaza al llegar al límite por minuto sin crear el mensaje", async () => {
    mocks.messageCount.mockResolvedValue(LIMITE_MENSAJES_POR_MINUTO);

    await expect(enviarMensaje("conv-1", "comprador-1", "Hola")).rejects.toBeInstanceOf(
      LimiteMensajesError
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
    const [argumento] = mocks.messageCount.mock.calls[0] as [
      { where: { senderId: string; createdAt: { gte: Date } } },
    ];
    expect(argumento.where.senderId).toBe("comprador-1");
    expect(Date.now() - argumento.where.createdAt.gte.getTime()).toBeLessThanOrEqual(61_000);
  });

  it("enviarMensaje envía por debajo del límite", async () => {
    mocks.messageCount.mockResolvedValue(LIMITE_MENSAJES_POR_MINUTO - 1);

    await expect(enviarMensaje("conv-1", "comprador-1", "Hola")).resolves.toEqual(mensajeCreado);
  });

  it("crearConversacionOMensaje rechaza una conversación nueva al llegar al límite diario", async () => {
    mocks.conversationCount.mockResolvedValue(LIMITE_CONVERSACIONES_NUEVAS_POR_DIA);

    await expect(
      crearConversacionOMensaje("comprador-1", "lista-1", "¿Sigue disponible?")
    ).rejects.toThrow(/consultas nuevas por día/);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("seguir una conversación existente no cuenta para el límite diario", async () => {
    mocks.conversationFindUnique.mockResolvedValue({ id: "conv-1" });
    mocks.conversationCount.mockResolvedValue(LIMITE_CONVERSACIONES_NUEVAS_POR_DIA);

    await crearConversacionOMensaje("comprador-1", "lista-1", "¿Sigue disponible?");

    expect(mocks.conversationCount).not.toHaveBeenCalled();
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("crearConversacionOMensaje también respeta el límite por minuto", async () => {
    mocks.messageCount.mockResolvedValue(LIMITE_MENSAJES_POR_MINUTO);

    await expect(
      crearConversacionOMensaje("comprador-1", "lista-1", "Hola")
    ).rejects.toBeInstanceOf(LimiteMensajesError);
  });
});
