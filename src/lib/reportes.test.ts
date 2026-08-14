import { describe, expect, it } from "vitest";
import {
  inicioDiaArgentina,
  LimiteReportesError,
  LIMITE_REPORTES_POR_DIA_POR_USUARIO,
  ReporteNoEncontradoError,
  ReporteNoRevisadoError,
  TransicionEstadoInvalidaError,
  validarTransicionReporte,
} from "./reportes";

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