import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUniqueUser: vi.fn(),
  findFirstListing: vi.fn(),
  updateListing: vi.fn(),
  findUniqueReport: vi.fn(),
  findManyReport: vi.fn(),
  countReport: vi.fn(),
  createReport: vi.fn(),
  updateReport: vi.fn(),
  findManyModerationAction: vi.fn(),
  createModerationAction: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    user: { findUnique: mocks.findUniqueUser },
    listing: { findFirst: mocks.findFirstListing, update: mocks.updateListing },
    report: {
      findUnique: mocks.findUniqueReport,
      findMany: mocks.findManyReport,
      count: mocks.countReport,
      create: mocks.createReport,
      update: mocks.updateReport,
    },
    moderationAction: {
      findMany: mocks.findManyModerationAction,
      create: mocks.createModerationAction,
    },
  },
}));

vi.mock("@/lib/notificaciones", () => ({
  notificarCambioEstadoPublicacion: vi.fn(),
  notificarFavoritosCambioPublicacion: vi.fn(),
}));

import { notificarCambioEstadoPublicacion } from "@/lib/notificaciones";
import {
  AutoReporteError,
  cambiarEstadoReporte,
  crearReporte,
  inicioDiaArgentina,
  LimiteReportesError,
  LIMITE_REPORTES_POR_DIA_POR_USUARIO,
  listarAcciones,
  obtenerReporteDetalle,
  obtenerReportes,
  pausarPublicacionReporte,
  PublicacionNoDisponibleError,
  rechazarPublicacionReporte,
  ReporteNoEncontradoError,
  ReporteNoRevisadoError,
  SinPermisoAdminError,
  TransicionEstadoInvalidaError,
  validarTransicionReporte,
} from "./reportes";

/**
 * Configura el mock de prisma.$transaction para que ejecute el callback con
 * un cliente de transacción mockeado (patrón del servicio, D5 del diseño).
 */
function ejecutarConTransaccion() {
  mocks.transaction.mockImplementation(
    async (fn: (tx: unknown) => unknown) =>
      fn({
        listing: { update: mocks.updateListing },
        report: { update: mocks.updateReport },
        moderationAction: { create: mocks.createModerationAction },
      })
  );
}

/** Configura el mock del usuario como administrador verificado en DB. */
function autenticarAdmin() {
  mocks.findUniqueUser.mockResolvedValue({ role: "ADMIN" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Ejecuta fn y devuelve el error que lanzó. Falla el test si fn no lanza
 * ningún error (así ninguna aserción de error queda "verde" por accidente).
 */
function capturarError(fn: () => void): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("Se esperaba que la función lanzara un error");
}

describe("validarTransicionReporte", () => {
  it.each([
    ["OPEN", "REVIEWED"],
    ["REVIEWED", "RESOLVED"],
    ["REVIEWED", "DISMISSED"],
  ] as const)("acepta la transición válida %s → %s", (desde, hacia) => {
    expect(() => validarTransicionReporte(desde, hacia)).not.toThrow();
  });

  it("acepta el flujo completo Abierto → Revisado → Resuelto", () => {
    expect(() => {
      validarTransicionReporte("OPEN", "REVIEWED");
      validarTransicionReporte("REVIEWED", "RESOLVED");
    }).not.toThrow();
  });

  it.each([
    ["OPEN", "OPEN"],
    ["OPEN", "RESOLVED"],
    ["OPEN", "DISMISSED"],
    ["REVIEWED", "OPEN"],
    ["REVIEWED", "REVIEWED"],
    ["RESOLVED", "OPEN"],
    ["RESOLVED", "REVIEWED"],
    ["RESOLVED", "RESOLVED"],
    ["RESOLVED", "DISMISSED"],
    ["DISMISSED", "OPEN"],
    ["DISMISSED", "REVIEWED"],
    ["DISMISSED", "RESOLVED"],
    ["DISMISSED", "DISMISSED"],
  ] as const)("rechaza la transición inválida %s → %s", (desde, hacia) => {
    expect(() => validarTransicionReporte(desde, hacia)).toThrow(
      TransicionEstadoInvalidaError
    );
  });
});

describe("TransicionEstadoInvalidaError", () => {
  it("lleva código TRANSICION_INVALIDA, HTTP 400 y mensaje claro en español", () => {
    const error = capturarError(() =>
      validarTransicionReporte("OPEN", "RESOLVED")
    ) as TransicionEstadoInvalidaError;

    expect(error).toBeInstanceOf(TransicionEstadoInvalidaError);
    expect(error.name).toBe("TransicionEstadoInvalidaError");
    expect(error.codigo).toBe("TRANSICION_INVALIDA");
    expect(error.status).toBe(400);
    expect(error.message).toBe(
      "No se puede pasar el reporte de Abierto a Resuelto. El flujo es Abierto → Revisado → Resuelto/Descartado."
    );
  });
});

describe("errores de dominio del módulo de reportes", () => {
  it("LimiteReportesError lleva código REPORT_LIMIT_EXCEEDED, HTTP 429 y mensaje en español", () => {
    const error = new LimiteReportesError();

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("LimiteReportesError");
    expect(error.codigo).toBe("REPORT_LIMIT_EXCEEDED");
    expect(error.status).toBe(429);
    expect(error.message).toBe(
      "Alcanzaste el límite de 5 reportes por día. Intentalo de nuevo mañana."
    );
  });

  it("ReporteNoRevisadoError lleva código REPORTE_NO_REVISADO, HTTP 400 y mensaje en español", () => {
    const error = new ReporteNoRevisadoError();

    expect(error.name).toBe("ReporteNoRevisadoError");
    expect(error.codigo).toBe("REPORTE_NO_REVISADO");
    expect(error.status).toBe(400);
    expect(error.message).toBe(
      "Para pausar o rechazar la publicación, el reporte debe estar Revisado."
    );
  });

  it("ReporteNoEncontradoError lleva código REPORTE_NO_ENCONTRADO, HTTP 404 y mensaje en español", () => {
    const error = new ReporteNoEncontradoError();

    expect(error.name).toBe("ReporteNoEncontradoError");
    expect(error.codigo).toBe("REPORTE_NO_ENCONTRADO");
    expect(error.status).toBe(404);
    expect(error.message).toBe("El reporte no existe.");
  });
});

describe("LIMITE_REPORTES_POR_DIA_POR_USUARIO", () => {
  it("permite hasta 5 reportes por día por usuario", () => {
    expect(LIMITE_REPORTES_POR_DIA_POR_USUARIO).toBe(5);
  });
});

describe("inicioDiaArgentina", () => {
  it("inicia el día a las 00:00 ART, que en UTC es 03:00", () => {
    // 14 de agosto de 2026, 12:00 UTC = 09:00 ART del mismo día.
    expect(inicioDiaArgentina(new Date("2026-08-14T12:00:00.000Z")).toISOString()).toBe(
      "2026-08-14T03:00:00.000Z"
    );
  });

  it("usa el calendario argentino cuando UTC ya cambió de día", () => {
    // 00:30 UTC del 14 = 21:30 ART del 13 → el día argentino es el 13.
    expect(inicioDiaArgentina(new Date("2026-08-14T00:30:00.000Z")).toISOString()).toBe(
      "2026-08-13T03:00:00.000Z"
    );
  });

  it("respeta la frontera de medianoche ART (23:59 vs 00:00)", () => {
    // 02:59:59.999 UTC = 23:59:59.999 ART del 13; 03:00:00 UTC = 00:00 ART del 14.
    expect(inicioDiaArgentina(new Date("2026-08-14T02:59:59.999Z")).toISOString()).toBe(
      "2026-08-13T03:00:00.000Z"
    );
    expect(inicioDiaArgentina(new Date("2026-08-14T03:00:00.000Z")).toISOString()).toBe(
      "2026-08-14T03:00:00.000Z"
    );
  });
});

describe("crearReporte — límite anti-spam por día (RF-25)", () => {
  it("rechaza con LimiteReportesError el 6.º reporte del día y no crea nada", async () => {
    mocks.findFirstListing.mockResolvedValue({
      id: "listing-1",
      ownerId: "owner-1",
    });
    mocks.countReport.mockResolvedValue(5);

    await expect(
      crearReporte("user-1", { listingId: "listing-1", razon: "SPAM" })
    ).rejects.toThrow(LimiteReportesError);

    expect(mocks.createReport).not.toHaveBeenCalled();
  });

  it("permite el 4.º reporte del día (dentro del límite) y lo crea", async () => {
    mocks.findFirstListing.mockResolvedValue({
      id: "listing-1",
      ownerId: "owner-1",
    });
    mocks.countReport.mockResolvedValue(4);
    mocks.createReport.mockResolvedValue({ id: "reporte-1", status: "OPEN" });

    const reporte = await crearReporte("user-1", {
      listingId: "listing-1",
      razon: "SPAM",
      detalles: "  texto con espacios  ",
    });

    expect(mocks.createReport).toHaveBeenCalledWith({
      data: {
        reporterId: "user-1",
        listingId: "listing-1",
        reason: "SPAM",
        details: "texto con espacios",
      },
    });
    expect(reporte).toEqual({ id: "reporte-1", status: "OPEN" });
  });

  it("reinicia la cuenta en la medianoche argentina: la ventana cambia de día", async () => {
    vi.useFakeTimers();
    mocks.findFirstListing.mockResolvedValue({
      id: "listing-1",
      ownerId: "owner-1",
    });
    mocks.countReport.mockResolvedValue(0);
    mocks.createReport.mockResolvedValue({ id: "reporte-1", status: "OPEN" });

    // 02:59:59.999 UTC = 23:59:59.999 ART del 13 → la ventana es el día 13.
    vi.setSystemTime(new Date("2026-08-14T02:59:59.999Z"));
    await crearReporte("user-1", { listingId: "listing-1", razon: "SPAM" });

    // 03:00:00 UTC = 00:00 ART del 14 → la ventana arranca un día nuevo.
    vi.setSystemTime(new Date("2026-08-14T03:00:00.000Z"));
    await crearReporte("user-1", { listingId: "listing-1", razon: "SPAM" });

    expect(mocks.countReport).toHaveBeenNthCalledWith(1, {
      where: {
        reporterId: "user-1",
        createdAt: { gte: new Date("2026-08-13T03:00:00.000Z") },
      },
    });
    expect(mocks.countReport).toHaveBeenNthCalledWith(2, {
      where: {
        reporterId: "user-1",
        createdAt: { gte: new Date("2026-08-14T03:00:00.000Z") },
      },
    });
  });

  it("conserva la validación de publicación no disponible (sin contar el día)", async () => {
    mocks.findFirstListing.mockResolvedValue(null);

    await expect(
      crearReporte("user-1", { listingId: "listing-1", razon: "SPAM" })
    ).rejects.toThrow(PublicacionNoDisponibleError);

    expect(mocks.countReport).not.toHaveBeenCalled();
    expect(mocks.createReport).not.toHaveBeenCalled();
  });

  it("conserva la validación de auto-reporte (sin contar el día)", async () => {
    mocks.findFirstListing.mockResolvedValue({
      id: "listing-1",
      ownerId: "user-1",
    });

    await expect(
      crearReporte("user-1", { listingId: "listing-1", razon: "SPAM" })
    ).rejects.toThrow(AutoReporteError);

    expect(mocks.countReport).not.toHaveBeenCalled();
    expect(mocks.createReport).not.toHaveBeenCalled();
  });
});

describe("cambiarEstadoReporte — transición auditada", () => {
  it("persiste el cambio de estado y su ModerationAction en una misma transacción", async () => {
    autenticarAdmin();
    mocks.findUniqueReport.mockResolvedValue({ status: "REVIEWED" });
    ejecutarConTransaccion();
    mocks.updateReport.mockResolvedValue({ id: "r1", status: "RESOLVED" });
    mocks.createModerationAction.mockResolvedValue({ id: "accion-1" });

    const resultado = await cambiarEstadoReporte("admin-1", "r1", "RESOLVED");

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.updateReport).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { status: "RESOLVED" },
    });
    expect(mocks.createModerationAction).toHaveBeenCalledWith({
      data: { reportId: "r1", adminId: "admin-1", accion: "RESOLVED" },
    });
    expect(resultado).toEqual({ id: "r1", status: "RESOLVED" });
  });

  it("rechaza la transición inválida sin mutar estado ni registrar auditoría", async () => {
    autenticarAdmin();
    mocks.findUniqueReport.mockResolvedValue({ status: "OPEN" });

    await expect(
      cambiarEstadoReporte("admin-1", "r1", "RESOLVED")
    ).rejects.toThrow(TransicionEstadoInvalidaError);

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.updateReport).not.toHaveBeenCalled();
    expect(mocks.createModerationAction).not.toHaveBeenCalled();
  });

  it("lanza ReporteNoEncontradoError si el reporte no existe", async () => {
    autenticarAdmin();
    mocks.findUniqueReport.mockResolvedValue(null);

    await expect(
      cambiarEstadoReporte("admin-1", "r1", "REVIEWED")
    ).rejects.toThrow(ReporteNoEncontradoError);

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("exige rol ADMIN verificado en la base de datos", async () => {
    mocks.findUniqueUser.mockResolvedValue({ role: "USER" });

    await expect(
      cambiarEstadoReporte("user-1", "r1", "REVIEWED")
    ).rejects.toThrow(SinPermisoAdminError);
  });
});

describe("pausarPublicacionReporte / rechazarPublicacionReporte", () => {
  it("pausa la publicación y audita con accion PAUSED cuando el reporte está REVIEWED", async () => {
    autenticarAdmin();
    mocks.findUniqueReport.mockResolvedValue({ status: "REVIEWED" });
    mocks.findFirstListing.mockResolvedValue({
      id: "l1",
      ownerId: "owner-1",
      title: "Tractor",
    });
    ejecutarConTransaccion();
    mocks.updateListing.mockResolvedValue({ id: "l1", status: "PAUSED" });
    mocks.createModerationAction.mockResolvedValue({ id: "accion-1" });

    const resultado = await pausarPublicacionReporte("admin-1", "l1", "r1");

    expect(mocks.updateListing).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: { status: "PAUSED" },
      select: { id: true, status: true },
    });
    expect(mocks.createModerationAction).toHaveBeenCalledWith({
      data: { reportId: "r1", adminId: "admin-1", accion: "PAUSED" },
    });
    expect(notificarCambioEstadoPublicacion).toHaveBeenCalledWith(
      "owner-1",
      "l1",
      "Tractor",
      "pausada"
    );
    expect(resultado).toEqual({
      publicacion: { id: "l1", status: "PAUSED" },
      accion: { id: "accion-1" },
    });
  });

  it("rechaza pausar/rechazar si el reporte no está REVIEWED", async () => {
    autenticarAdmin();
    mocks.findUniqueReport.mockResolvedValue({ status: "OPEN" });

    await expect(
      pausarPublicacionReporte("admin-1", "l1", "r1")
    ).rejects.toThrow(ReporteNoRevisadoError);
    await expect(
      rechazarPublicacionReporte("admin-1", "l1", "r1")
    ).rejects.toThrow(ReporteNoRevisadoError);

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.updateListing).not.toHaveBeenCalled();
  });

  it("rechaza pausar/rechazar si el reporte no existe", async () => {
    autenticarAdmin();
    mocks.findUniqueReport.mockResolvedValue(null);

    await expect(
      pausarPublicacionReporte("admin-1", "l1", "r1")
    ).rejects.toThrow(ReporteNoEncontradoError);
    await expect(
      rechazarPublicacionReporte("admin-1", "l1", "r1")
    ).rejects.toThrow(ReporteNoEncontradoError);
  });

  it("rechaza la publicación y audita con accion REJECTED cuando el reporte está REVIEWED", async () => {
    autenticarAdmin();
    mocks.findUniqueReport.mockResolvedValue({ status: "REVIEWED" });
    mocks.findFirstListing.mockResolvedValue({
      id: "l1",
      ownerId: "owner-1",
      title: "Tractor",
    });
    ejecutarConTransaccion();
    mocks.updateListing.mockResolvedValue({
      id: "l1",
      status: "REJECTED",
      deletedAt: new Date("2026-08-14T03:00:00.000Z"),
    });
    mocks.createModerationAction.mockResolvedValue({ id: "accion-2" });

    const resultado = await rechazarPublicacionReporte("admin-1", "l1", "r1");

    expect(mocks.updateListing).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: { status: "REJECTED", deletedAt: expect.any(Date) },
      select: { id: true, status: true, deletedAt: true },
    });
    expect(mocks.createModerationAction).toHaveBeenCalledWith({
      data: { reportId: "r1", adminId: "admin-1", accion: "REJECTED" },
    });
    expect(notificarCambioEstadoPublicacion).toHaveBeenCalledWith(
      "owner-1",
      "l1",
      "Tractor",
      "rechazada"
    );
    expect(resultado.publicacion).toEqual({
      id: "l1",
      status: "REJECTED",
      deletedAt: expect.any(Date),
    });
  });
});

describe("obtenerReporteDetalle — detalle con historial", () => {
  it("retorna el reporte con publicación, reporter e historial ascendente", async () => {
    autenticarAdmin();
    const reporteEsperado = { id: "r1", status: "REVIEWED" };
    mocks.findUniqueReport.mockResolvedValue(reporteEsperado);

    const resultado = await obtenerReporteDetalle("admin-1", "r1");

    expect(mocks.findUniqueReport).toHaveBeenCalledWith({
      where: { id: "r1" },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            status: true,
            owner: { select: { id: true, name: true, image: true } },
          },
        },
        reporter: { select: { id: true, name: true, image: true } },
        acciones: {
          orderBy: { createdAt: "asc" },
          include: { admin: { select: { id: true, name: true, image: true } } },
        },
      },
    });
    expect(resultado).toBe(reporteEsperado);
  });

  it("lanza ReporteNoEncontradoError si el reporte no existe", async () => {
    autenticarAdmin();
    mocks.findUniqueReport.mockResolvedValue(null);

    await expect(
      obtenerReporteDetalle("admin-1", "r1")
    ).rejects.toThrow(ReporteNoEncontradoError);
  });
});

describe("listarAcciones — historial cronológico de un reporte", () => {
  it("lista las acciones en orden ascendente con el admin que las ejecutó", async () => {
    autenticarAdmin();
    const accionesEsperadas = [{ id: "accion-1" }, { id: "accion-2" }];
    mocks.findManyModerationAction.mockResolvedValue(accionesEsperadas);

    const resultado = await listarAcciones("admin-1", "r1");

    expect(mocks.findManyModerationAction).toHaveBeenCalledWith({
      where: { reportId: "r1" },
      orderBy: { createdAt: "asc" },
      include: { admin: { select: { id: true, name: true, image: true } } },
    });
    expect(resultado).toEqual(accionesEsperadas);
  });
});

describe("obtenerReportes — filtros combinables del panel", () => {
  it("combina los filtros de estado y motivo en el where", async () => {
    autenticarAdmin();
    mocks.findManyReport.mockResolvedValue([]);
    mocks.countReport.mockResolvedValue(0);

    await obtenerReportes("admin-1", { estado: "OPEN", motivo: "FRAUD" });

    const where = { status: "OPEN", reason: "FRAUD" };
    expect(mocks.findManyReport).toHaveBeenCalledWith(
      expect.objectContaining({ where })
    );
    expect(mocks.countReport).toHaveBeenCalledWith({ where });
  });

  it("pagina desde 1 con el tamaño del panel y calcula las páginas totales", async () => {
    autenticarAdmin();
    mocks.findManyReport.mockResolvedValue([{ id: "r1" }]);
    mocks.countReport.mockResolvedValue(1);

    const resultado = await obtenerReportes("admin-1", {});

    expect(mocks.findManyReport).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20, orderBy: { createdAt: "desc" } })
    );
    expect(resultado.totalPaginas).toBe(1);
    expect(resultado.pagina).toBe(1);
  });
});
