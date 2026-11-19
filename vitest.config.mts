import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Configuración de tests (Vitest 4 + Testing Library + jsdom).
// - Alias `@` → `src`, igual que en tsconfig.
// - jsdom para los tests de componentes y páginas; los tests de lógica
//   (src/lib) también corren acá sin problema.
// - `globals: true` para que Testing Library limpie el DOM entre tests.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
