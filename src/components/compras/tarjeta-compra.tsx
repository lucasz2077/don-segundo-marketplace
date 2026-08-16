import Image from "next/image";
import { formatearPrecio } from "@/lib/formato";
import type { CompraConDetalle } from "@/lib/compras";
import type {
  CompraEstadoPago,
  MotivoReembolso,
} from "@/generated/prisma/client";
import { Tarjeta } from "@/components/ui/tarjeta";
import { EstrellasCalificacion } from "./estrellas-calificacion";
import { BotonCalificar } from "./boton-calificar";
import { BotonSolicitarDevolucion } from "./boton-solicitar-devolucion";

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Clases del badge según estado de pago (RF-41): reutiliza los tonos
 * semánticos del proyecto (amber/success/danger + neutros brand y sand), el
 * mismo patrón de las etiquetas de estado de verificaciones. */
const CLASES_ESTADO_PAGO: Record<CompraEstadoPago, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  APROBADO: "bg-success/15 text-success",
  FALLIDO: "bg-danger/15 text-danger",
  REEMBOLSADO: "bg-brand-50 text-brand-700",
  EXPIRADA: "bg-sand-200 text-sand-700",
};

/** Texto del badge en español según estado de pago (RF-41). */
const TEXTO_ESTADO_PAGO: Record<CompraEstadoPago, string> = {
  PENDIENTE: "Pago pendiente",
  APROBADO: "Pago aprobado",
  FALLIDO: "Pago fallido",
  REEMBOLSADO: "Reembolsada",
  EXPIRADA: "Expirada",
};

/** Motivo de reembolso en español (RF-41); SIN_STOCK repite el texto de
 * /pagos/resultado para mantener coherencia. */
const TEXTO_MOTIVO_REEMBOLSO: Record<MotivoReembolso, string> = {
  SIN_STOCK: "Se agotó antes de confirmarse",
  DEVOLUCION_VENDEDOR: "Devolución del vendedor",
};

/** Mapa mínimo de métodos de Mercado Pago a etiquetas legibles (RF-41):
 * solo los slugs conocidos; cualquier otro valor se muestra crudo para no
 * romper por métodos nuevos. */
const ETIQUETAS_MEDIO_PAGO: Record<string, string> = {
  credit_card: "Tarjeta de crédito",
  account_money: "Dinero en cuenta",
  ticket: "Efectivo",
};

function etiquetaMedioPago(medioPago: string | null): string | null {
  if (!medioPago) {
    return null;
  }
  return ETIQUETAS_MEDIO_PAGO[medioPago] ?? medioPago;
}

type TarjetaCompraProps = {
  compra: CompraConDetalle;
  /** true si la compra está en ventana, sin rating y con pago APROBADO
   * (muestra el CTA; RF-41/D9). */
  calificable: boolean;
  /** true si el pago está APROBADO, la compra está dentro de la ventana de
   * devolución de 7 días y no hay solicitud PENDIENTE (muestra el CTA
   * "Solicitar devolución"; RF-49/5.4). */
  devolucionable: boolean;
};

/**
 * Fila de compra en /compras (RF-29/RF-41): publicación, precio histórico
 * pagado, fecha, badge de estado de pago (PENDIENTE/APROBADO/FALLIDO/
 * REEMBOLSADO/EXPIRADA, con medio de pago y motivo de reembolso cuando
 * existen) y estado de la reseña. Con rating muestra la calificación del
 * usuario; dentro de la ventana y sin rating ofrece el CTA "Calificar" que
 * despliega el formulario inline (D6); fuera de la ventana informa el estado
 * sin CTA (escenario RF-29 "compra no calificable"). Las compras con pago no
 * aprobado nunca muestran CTA ni mensaje de ventana (RF-41/D9), solo el
 * badge de estado.
 */
export function TarjetaCompra({
  compra,
  calificable,
  devolucionable,
}: TarjetaCompraProps) {
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

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASES_ESTADO_PAGO[compra.estadoPago]}`}
            >
              {TEXTO_ESTADO_PAGO[compra.estadoPago]}
            </span>
            {compra.estadoPago === "APROBADO" &&
            etiquetaMedioPago(compra.medioPago) ? (
              <span className="text-sm text-brand-600 dark:text-brand-200">
                Medio de pago: {etiquetaMedioPago(compra.medioPago)}
              </span>
            ) : null}
            {compra.estadoPago === "REEMBOLSADO" && compra.motivoReembolso ? (
              <span className="text-sm text-brand-600 dark:text-brand-200">
                {TEXTO_MOTIVO_REEMBOLSO[compra.motivoReembolso]}
              </span>
            ) : null}
          </div>

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
          ) : compra.estadoPago === "APROBADO" ? (
            <p className="mt-3 text-sm text-brand-600 dark:text-brand-200">
              La ventana de calificación ya venció.
            </p>
          ) : null}

          {/* Devolución (RF-49/5.4): con solicitud PENDIENTE se informa el
              estado en revisión; sin ella y dentro de la ventana de 7 días
              se ofrece el CTA que despliega el formulario inline. Fuera de
              la ventana no se muestra nada para no duplicar mensajes con la
              calificación. */}
          {compra.solicitudPendienteId ? (
            <p className="mt-3 text-sm text-brand-600 dark:text-brand-200">
              Solicitud de devolución en revisión.
            </p>
          ) : devolucionable ? (
            <div className="mt-3">
              <BotonSolicitarDevolucion compraId={compra.id} />
            </div>
          ) : null}
        </div>
      </div>
    </Tarjeta>
  );
}