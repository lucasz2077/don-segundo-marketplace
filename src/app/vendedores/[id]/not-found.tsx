import { PantallaNoEncontrada } from "@/components/layout/pantalla-no-encontrada";
import { BotonEnlace } from "@/components/ui/boton-enlace";

/** Perfil de vendedor inexistente (RF-24). */
export default function VendedorNoEncontrado() {
  return (
    <PantallaNoEncontrada
      titulo="No encontramos este vendedor"
      descripcion="El enlace puede tener un error o la cuenta ya no existe. Podés seguir buscando entre las publicaciones activas."
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
