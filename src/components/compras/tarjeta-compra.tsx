import Image from "next/image";
import { formatearPrecio } from "@/lib/formato";
import type { CompraConDetalle } from "@/lib/compras";
import { Tarjeta } from "@/components/ui/tarjeta";
import { EstrellasCalificacion } from "./estrellas-calificacion";
import { BotonCalificar } from "./boton-calificar";

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

type TarjetaCompraProps = {
  compra: CompraConDetalle;
  /** true si la compra está en ventana y sin rating (muestra el CTA). */
  calificable: boolean;
};

/**
 * Fila de compra en /compras (RF-29): publicación, precio histórico pagado,
 * fecha y estado de la reseña. Con rating muestra la calificación del
 * usuario; dentro de la ventana y sin rating ofrece el CTA "Calificar" que
 * despliega el formulario inline (D6); fuera de la ventana informa el estado
 * sin CTA (escenario RF-29 "compra no calificable").
 */
export function TarjetaCompra({ compra, calificable }: TarjetaCompraProps) {
  const imagen = compra.listing.images[0];

  return (
    <Tarjeta
      as="article"
      className="transition-shadow motion-safe:transition-shadow hover:shadow-card-hover"
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        {imagen ? (
          <Image
            src={imagen.url}
            alt={imagen.alt ?? compra.listing.title}
            width={96}
            height={96}
            className="h-24 w-24 shrink-0 rounded-card object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-card bg-brand-50">
            <span className="text-xs text-brand-600 dark:text-brand-200">
              Sin foto
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-medium text-brand-900 dark:text-bone">
            {compra.listing.title}
          </h3>
          <p className="mt-1 text-sm font-medium text-brand-900 dark:text-bone">
            {formatearPrecio(compra.precioUnitario, compra.currency)}
          </p>
          <p className="mt-1 text-sm text-brand-600 dark:text-brand-200">
            Comprado el {formateadorFecha.format(compra.createdAt)}
          </p>

          {compra.rating ? (
            <div className="mt-3">
              <EstrellasCalificacion
                promedio={compra.rating.puntaje}
                cantidad={1}
                tamanio="sm"
              />
              <p className="mt-1 text-sm font-medium text-brand-900 dark:text-bone">
                Tu calificación
              </p>
              {compra.rating.comentario ? (
                <p className="mt-1 text-sm text-brand-700 dark:text-brand-200">
                  {compra.rating.comentario}
                </p>
              ) : null}
            </div>
          ) : calificable ? (
            <div className="mt-3">
              <BotonCalificar compraId={compra.id} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-brand-600 dark:text-brand-200">
              La ventana de calificación ya venció.
            </p>
          )}
        </div>
      </div>
    </Tarjeta>
  );
}