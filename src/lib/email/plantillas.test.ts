import { describe, expect, it } from "vitest";

import {
  escaparHtml,
  plantillaAviso,
  plantillaRestablecerContrasenia,
  plantillaVerificacion,
} from "./plantillas";

describe("plantillas de mail", () => {
  it("escapa HTML de datos del usuario", () => {
    expect(escaparHtml(`<script>"x"&'y'</script>`)).toBe(
      "&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;"
    );
  });

  it("verificación: saluda por el primer nombre e incluye el enlace en HTML y texto (RF-01)", () => {
    const url = "https://ejemplo.com/api/auth/verify-email?token=abc&callbackURL=/perfil";
    const contenido = plantillaVerificacion("Ana María Pérez", url);

    expect(contenido.asunto).toBe("Confirmá tu email en Don Segundo");
    expect(contenido.html).toContain("Hola, Ana:");
    expect(contenido.html).toContain(escaparHtml(url));
    expect(contenido.texto).toContain(url);
  });

  it("restablecer: incluye el enlace y aclara qué hacer si no lo pidió (RF-03)", () => {
    const contenido = plantillaRestablecerContrasenia(null, "https://ejemplo.com/reset");

    expect(contenido.html).toContain("Hola:");
    expect(contenido.html).toContain("https://ejemplo.com/reset");
    expect(contenido.texto).toContain("Si no lo pediste vos");
  });

  it("aviso: no permite inyectar HTML con el nombre o el mensaje", () => {
    const contenido = plantillaAviso({
      nombre: "<b>Juan</b>",
      titulo: "Vendiste un tractor",
      mensaje: "Compró <img src=x onerror=alert(1)>",
      url: "https://ejemplo.com/perfil",
    });

    expect(contenido.html).not.toContain("<img");
    expect(contenido.html).not.toContain("<b>Juan</b>");
    expect(contenido.asunto).toBe("Vendiste un tractor");
  });
});
