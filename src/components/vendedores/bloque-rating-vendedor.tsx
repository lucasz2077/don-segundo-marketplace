import { EstrellasCalificacion } from "@/components/compras/estrellas-calificacion";

type BloqueRatingVendedorProps = {
  /** Agregados ya validados: solo se renderiza con 3+ muestras (RF-24). */
  rating: { promedio: number; cantidad: number };
};

/**
 * Bloque de rating del perfil público del vendedor (RF-24): estrellas,
 * promedio y cantidad de reseñas, visibles para todos los visitantes cuando
 * hay 3 o más muestras. La página decide si renderizarlo (rating !== null).
 */
export function BloqueRatingVendedor({ rating }: BloqueRatingVendedorProps) {
  return (
    <div className="mt-2">
      <EstrellasCalificacion
        promedio={rating.promedio}
        cantidad={rating.cantidad}
      />
    </div>
  );
}