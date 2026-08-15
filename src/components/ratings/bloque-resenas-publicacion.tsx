import { EstrellasCalificacion } from "@/components/compras/estrellas-calificacion";
import { BotonEliminarResenia } from "@/components/ratings/boton-eliminar-resenia";
import type { ResenaPublicacion } from "@/lib/ratings";

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

type BloqueResenasPublicacionProps = {
  resenas: ResenaPublicacion[];
  /** Usuario autenticado para mostrar el botón borrar en sus propias reseñas. */
  usuarioId?: string | null;
};

/**
 * Bloque de reseñas de una publicación (RF-30), server-safe: cada reseña
 * muestra autor, estrellas, fecha y comentario. Si el usuario viendo la
 * publicación es el autor de una reseña, se muestra su botón de eliminación
 * (componente hijo cliente, RF-31).
 */
export function BloqueResenasPublicacion({
  resenas,
  usuarioId,
}: BloqueResenasPublicacionProps) {
  return (
    <section className="mt-10" aria-labelledby="resenas-titulo">
      <div className="flex items-center gap-2">
        <h2
          id="resenas-titulo"
          className="text-lg font-semibold text-brand-900 dark:text-bone"
        >
          Reseñas de esta publicación
        </h2>
        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          {resenas.length}
        </span>
      </div>

      <ul className="mt-4 divide-y divide-brand-100">
        {resenas.map((resena) => (
          <li key={resena.id} className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-900 dark:text-bone">
                  {resena.autor}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <EstrellasCalificacion
                    promedio={resena.puntaje}
                    cantidad={1}
                    tamanio="sm"
                  />
                  <p className="text-xs text-brand-600 dark:text-brand-200">
                    {formateadorFecha.format(resena.fecha)}
                  </p>
                </div>
              </div>
              {resena.autorId === usuarioId ? (
                <BotonEliminarResenia reseniaId={resena.id} />
              ) : null}
            </div>
            {resena.comentario ? (
              <p className="mt-2 text-sm leading-relaxed text-brand-900 dark:text-bone">
                {resena.comentario}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}