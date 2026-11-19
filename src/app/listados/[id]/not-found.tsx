import { PantallaNoEncontrada } from "@/components/layout/pantalla-no-encontrada";
import { BotonEnlace } from "@/components/ui/boton-enlace";

/**
 * Publicación inexistente, eliminada, rechazada por moderación (CA-07) o
 * pausada para quien no puede verla.
 */
export default function PublicacionNoEncontrada() {
  return (
    <PantallaNoEncontrada
      titulo="Esta publicación ya no está disponible"
      descripcion="Puede que el vendedor la haya pausado o eliminado, o que se haya dado de baja. Hay muchas más esperándote."
      acciones={
        <>
          <BotonEnlace href="/listados">Ver publicaciones parecidas</BotonEnlace>
          <BotonEnlace href="/favoritos" variante="secundario">
            Ir a mis favoritos
          </BotonEnlace>
        </>
      }
    />
  );
}
