import { PantallaNoEncontrada } from "@/components/layout/pantalla-no-encontrada";
import { BotonEnlace } from "@/components/ui/boton-enlace";

/**
 * 404 global: rutas inexistentes y `notFound()` de zonas sin pantalla propia
 * (p. ej. categorías). Explica qué pasó y ofrece volver a buscar o al inicio.
 */
export default function NoEncontrada() {
  return (
    <PantallaNoEncontrada
      titulo="No encontramos esta página"
      descripcion="Puede que la publicación ya no esté disponible o que el enlace tenga un error. Probá buscando desde el header o explorá las publicaciones activas."
      acciones={
        <>
          <BotonEnlace href="/listados">Explorar publicaciones</BotonEnlace>
          <BotonEnlace href="/" variante="secundario">
            Volver al inicio
          </BotonEnlace>
        </>
      }
    />
  );
}
