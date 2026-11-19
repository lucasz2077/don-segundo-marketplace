// Setup global de Vitest: agrega los matchers de jest-dom
// (`toBeInTheDocument`, `toHaveAttribute`, etc.).
import "@testing-library/jest-dom/vitest";

// jsdom no implementa IntersectionObserver (lo usan, p. ej., la barra de
// compra mobile del detalle). Sustituto inerte: nunca dispara el callback,
// así que los componentes quedan en su estado inicial.
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
