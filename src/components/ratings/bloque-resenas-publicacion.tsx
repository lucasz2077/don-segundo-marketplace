import { EstrellasCalificacion } from "@/components/compras/estrellas-calificacion";
import { BotonEliminarResenia } from "@/components/ratings/boton-eliminar-resenia";
import { Avatar } from "@/components/ui/avatar";
import { Insignia } from "@/components/ui/insignia";
import { Tarjeta } from "@/components/ui/tarjeta";
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
    <section aria-labelledby="resenas-titulo">
      <Tarjeta relleno="ninguno" className="p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <h2 id="resenas-titulo" className="text-lg font-semibold text-tinta">
            Reseñas de esta publicación
          </h2>
          <Insignia>{resenas.length}</Insignia>
        </div>

        <ul className="mt-2 divide-y divide-linea">
          {resenas.map((resena) => (
            <li key={resena.id} className="py-4 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar nombre={resena.autor} tamanio="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-tinta">{resena.autor}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <EstrellasCalificacion promedio={resena.puntaje} cantidad={1} tamanio="sm" />
                      <p className="text-xs text-tinta-tenue">
                        {formateadorFecha.format(resena.fecha)}
                      </p>
                    </div>
                  </div>
                </div>
                {resena.autorId === usuarioId ? (
                  <BotonEliminarResenia reseniaId={resena.id} />
                ) : null}
              </div>
              {resena.comentario ? (
                <p className="mt-2 pl-11 text-sm leading-relaxed text-tinta-suave">
                  {resena.comentario}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Tarjeta>
    </section>
  );
}
