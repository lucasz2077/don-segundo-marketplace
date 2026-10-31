import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { etiquetaDia } from "./chat-conversacion";

describe("etiquetaDia", () => {
  const ahora = new Date(2026, 9, 31, 10, 0);

  it("usa Hoy y Ayer para los días recientes", () => {
    expect(etiquetaDia(new Date(2026, 9, 31, 8, 4), ahora)).toBe("Hoy");
    expect(etiquetaDia(new Date(2026, 9, 30, 23, 59), ahora)).toBe("Ayer");
  });

  it("muestra día y mes en el año actual y suma el año si es otro", () => {
    expect(etiquetaDia(new Date(2026, 9, 12), ahora)).toBe("12 de octubre");
    expect(etiquetaDia(new Date(2025, 11, 3), ahora)).toBe("3 de diciembre de 2025");
  });
});
