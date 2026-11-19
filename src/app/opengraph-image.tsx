import { ImageResponse } from "next/og";

// Imagen por defecto al compartir el sitio (WhatsApp, redes), RNF-12.
export const alt = "Don Segundo — El marketplace del campo argentino";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ImagenCompartir() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#243c56",
          color: "#f5f8fb",
        }}
      >
        <div style={{ width: 120, height: 8, background: "#d9a13b", borderRadius: 4, marginBottom: 40 }} />
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>Don Segundo</div>
        <div style={{ marginTop: 24, fontSize: 44, color: "#cddcec" }}>
          El marketplace del campo argentino
        </div>
        <div style={{ marginTop: 48, fontSize: 26, color: "#a7c3da" }}>
          Maquinaria · Herramientas · Insumos · Hacienda · Repuestos · Servicios rurales
        </div>
      </div>
    ),
    size
  );
}
