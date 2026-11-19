import { PantallaNoEncontrada } from "@/components/layout/pantalla-no-encontrada";
import { BotonEnlace } from "@/components/ui/boton-enlace";

/** Reporte o solicitud de verificación inexistente en el panel admin. */
export default function AdminNoEncontrado() {
  return (
    <PantallaNoEncontrada
      titulo="No encontramos este elemento"
      descripcion="El reporte o la solicitud no existe o el enlace tiene un error. Volvé al listado para seguir revisando."
      acciones={
        <>
          <BotonEnlace href="/admin/reportes">Ver reportes</BotonEnlace>
          <BotonEnlace href="/admin/verificaciones" variante="secundario">
            Ver verificaciones
          </BotonEnlace>
        </>
      }
    />
  );
}
