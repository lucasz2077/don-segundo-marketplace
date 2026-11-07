// Setup global de Vitest: matchers de jest-dom (`toBeInTheDocument`, etc.) y
// limpieza del DOM entre tests.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom no implementa IntersectionObserver (lo usa la barra de compra móvil):
// stub inerte que nunca dispara el callback.
if (typeof globalThis.IntersectionObserver === "undefined") {
  class IntersectionObserverInerte implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "0px";
    readonly thresholds: ReadonlyArray<number> = [0];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver = IntersectionObserverInerte;
}
