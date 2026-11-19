import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notificationCreate: vi.fn(),
  notificationCount: vi.fn(),
  userFindUnique: vi.fn(),
  enviarEmail: vi.fn(),
  waitUntil: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    notification: { create: mocks.notificationCreate, count: mocks.notificationCount },
    user: { findUnique: mocks.userFindUnique },
  },
}));
vi.mock("@/lib/email/enviar", () => ({ enviarEmail: mocks.enviarEmail }));
vi.mock("@vercel/functions", () => ({ waitUntil: mocks.waitUntil }));

import {
  crearNotificacion,
  destinoNotificacion,
  enviarEmailNotificacion,
  parsearPayload,
} from "@/lib/notificaciones";

const base = {
  id: "notif-1",
  userId: "usuario-1",
  listingId: "lista-1",
  titulo: "Pago recibido",
  mensaje: 'Recibiste el pago de "Tractor" por 1500.00 ARS.',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://donsegundo.com.ar");
  mocks.userFindUnique.mockResolvedValue({ email: "ana@ejemplo.com", name: "Ana Pérez" });
  mocks.notificationCount.mockResolvedValue(0);
  mocks.enviarEmail.mockResolvedValue(true);
  mocks.notificationCreate.mockResolvedValue({ id: "notif-1", readAt: null });
});

describe("Mails de notificaciones (RF-20, RF-23)", () => {
  it("crearNotificacion guarda en la bandeja y despacha el mail en segundo plano", async () => {
    await crearNotificacion("usuario-1", "lista-1", "Título", "Mensaje");

    expect(mocks.notificationCreate).toHaveBeenCalledTimes(1);
    expect(mocks.waitUntil).toHaveBeenCalledTimes(1);
  });

  it("un fallo al programar el mail no rompe la notificación", async () => {
    mocks.waitUntil.mockImplementation(() => {
      throw new Error("sin contexto");
    });

    await expect(crearNotificacion("usuario-1", null, "Título", "Mensaje")).resolves.toEqual({
      id: "notif-1",
      readAt: null,
    });
  });

  it("manda la venta al vendedor con enlace absoluto e idempotencia por notificación", async () => {
    const enviado = await enviarEmailNotificacion({
      ...base,
      tipo: "GENERAL",
      payload: { evento: "pago_aprobado", compraId: "c1", listingId: "lista-1", titulo: "Tractor", monto: "1500.00" },
    });

    expect(enviado).toBe(true);
    expect(mocks.enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        para: "ana@ejemplo.com",
        asunto: "Pago recibido",
        claveIdempotencia: "notificacion-notif-1",
        texto: expect.stringContaining("https://donsegundo.com.ar/listados/lista-1"),
      })
    );
  });

  it("la compra confirmada lleva al comprador a Mis compras", async () => {
    await enviarEmailNotificacion({
      ...base,
      titulo: "Compra confirmada",
      tipo: "GENERAL",
      payload: { evento: "compra_confirmada", compraId: "c1", listingId: "lista-1", titulo: "Tractor", monto: "1500.00" },
    });

    expect(mocks.enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({ texto: expect.stringContaining("https://donsegundo.com.ar/compras") })
    );
  });

  it("agrupa los mensajes: no repite el mail si ya hay uno sin leer de la conversación", async () => {
    mocks.notificationCount.mockResolvedValue(1);

    const enviado = await enviarEmailNotificacion({
      ...base,
      titulo: "Nuevo mensaje de Juan",
      tipo: "MENSAJE_NUEVO",
      payload: { conversationId: "conv-1", mensajeId: "m2", emisorNombre: "Juan", preview: "¿Sigue?" },
    });

    expect(enviado).toBe(false);
    expect(mocks.enviarEmail).not.toHaveBeenCalled();
    const [consulta] = mocks.notificationCount.mock.calls[0] as [
      { where: { payload: unknown; readAt: null; id: { not: string } } },
    ];
    expect(consulta.where.payload).toEqual({ path: ["conversationId"], equals: "conv-1" });
    expect(consulta.where.readAt).toBeNull();
    expect(consulta.where.id).toEqual({ not: "notif-1" });
  });

  it("manda el primer mensaje de una conversación con enlace al chat", async () => {
    await enviarEmailNotificacion({
      ...base,
      titulo: "Nuevo mensaje de Juan",
      tipo: "MENSAJE_NUEVO",
      payload: { conversationId: "conv-1", mensajeId: "m1", emisorNombre: "Juan", preview: "¿Sigue?" },
    });

    expect(mocks.enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({ texto: expect.stringContaining("https://donsegundo.com.ar/mensajes/conv-1") })
    );
  });

  it("no manda mails por cambios en favoritos", async () => {
    const enviado = await enviarEmailNotificacion({
      ...base,
      tipo: "FAVORITO_CAMBIO_PRECIO",
      payload: { listingId: "lista-1", titulo: "Tractor", precioAnterior: "10", precioNuevo: "9" },
    });

    expect(enviado).toBe(false);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("no lanza si falla la base: devuelve false", async () => {
    mocks.userFindUnique.mockRejectedValue(new Error("base caída"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      enviarEmailNotificacion({ ...base, tipo: "GENERAL", payload: null })
    ).resolves.toBe(false);
  });
});

describe("destinoNotificacion", () => {
  it("devoluciones: el vendedor va a resolverla y el comprador a sus compras", () => {
    expect(
      destinoNotificacion({ tipo: "GENERAL", listingId: null, payload: { evento: "devolucion", solicitudId: "s", estado: "PENDIENTE" } })
    ).toEqual({ href: "/perfil/devoluciones", etiqueta: "Revisar solicitud" });
    expect(
      destinoNotificacion({ tipo: "GENERAL", listingId: null, payload: { evento: "devolucion", solicitudId: "s", estado: "APROBADA" } })
    ).toEqual({ href: "/compras", etiqueta: "Ver mis compras" });
  });

  it("parsea el payload de compra confirmada", () => {
    const payload = { evento: "compra_confirmada", compraId: "c", listingId: "l", titulo: "T", monto: "1.00" };
    expect(parsearPayload("GENERAL", payload)).toEqual(payload);
  });
});
