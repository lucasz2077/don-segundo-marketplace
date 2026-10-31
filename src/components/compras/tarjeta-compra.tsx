import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { CompraConDetalle } from "@/lib/compras";
import type {
  CompraEstadoPago,
  MotivoReembolso,
} from "@/generated/prisma/client";
import { Insignia, type TonoInsignia } from "@/components/ui/insignia";
import { Precio } from "@/components/ui/precio";
import { Tarjeta } from "@/components/ui/tarjeta";
import { EstrellasCalificacion } from "./estrellas-calificacion";
import { BotonCalificar } from "./boton-calificar";
import { BotonSolicitarDevolucion } from "./boton-solicitar-devolucion";

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Tono de la insignia según estado de pago (RF-41). */
const TONO_ESTADO_PAGO: Record<CompraEstadoPago, TonoInsignia> = {
  PENDIENTE: "advertencia",
  APROBADO: "exito",
  FALLIDO: "peligro",
  REEMBOLSO_PENDIENTE: "advertencia",
  REEMBOLSADO: "neutro",
  EXPIRADA: "inactivo",
};

/** Texto del badge en español según estado de pago (RF-41). */
const TEXTO_ESTADO_PAGO: Record<CompraEstadoPago, string> = {
  PENDIENTE: "Pago pendiente",
  APROBADO: "Pago aprobado",
  FALLIDO: "Pago fallido",
  REEMBOLSO_PENDIENTE: "Reembolso en curso",
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
    <Tarjeta as="article" relleno="ninguno" className="p-4 sm:p-5">
      <div className="flex gap-3 sm:gap-4">
        <Link
          href={`/listados/${compra.listing.id}`}
          className="relative size-20 shrink-0 overflow-hidden rounded-control bg-brand-50 sm:size-24"
        >
          {imagen ? (
            <Image
              src={imagen.url}
              alt={imagen.alt ?? compra.listing.title}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-tinta-tenue">
              <ImageOff className="size-5" aria-hidden="true" />
              <span className="sr-only">Sin foto</span>
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Insignia tono={TONO_ESTADO_PAGO[compra.estadoPago]}>
              {TEXTO_ESTADO_PAGO[compra.estadoPago]}
            </Insignia>
            <span className="text-xs text-tinta-tenue">
              {formateadorFecha.format(compra.createdAt)}
            </span>
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-sm font-medium text-tinta sm:text-base">
            <Link href={`/listados/${compra.listing.id}`} className="hover:underline">
              {compra.listing.title}
            </Link>
          </h3>
          <Precio
            precio={compra.precioUnitario}
            moneda={compra.currency}
            tamanio="sm"
            className="mt-1 font-medium"
          />
          {compra.estadoPago === "APROBADO" && etiquetaMedioPago(compra.medioPago) ? (
            <p className="mt-1 text-xs text-tinta-tenue">
              Medio de pago: {etiquetaMedioPago(compra.medioPago)}
            </p>
          ) : null}
          {(compra.estadoPago === "REEMBOLSADO" ||
            compra.estadoPago === "REEMBOLSO_PENDIENTE") &&
          compra.motivoReembolso ? (
            <p className="mt-1 text-xs text-tinta-tenue">
              {TEXTO_MOTIVO_REEMBOLSO[compra.motivoReembolso]}
            </p>
          ) : null}
        </div>
      </div>

      {compra.rating ||
      calificable ||
      compra.estadoPago === "APROBADO" ||
      compra.solicitudPendienteId ||
      devolucionable ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-linea pt-4">
          {compra.rating ? (
            <div>
              <p className="text-xs font-medium text-tinta-tenue">Tu calificación</p>
              <div className="mt-1">
                <EstrellasCalificacion
                  promedio={compra.rating.puntaje}
                  cantidad={1}
                  tamanio="sm"
                />
              </div>
              {compra.rating.comentario ? (
                <p className="mt-1 text-sm text-tinta-suave">{compra.rating.comentario}</p>
              ) : null}
            </div>
          ) : calificable ? (
            <BotonCalificar compraId={compra.id} />
          ) : compra.estadoPago === "APROBADO" ? (
            <p className="text-sm text-tinta-tenue">La ventana de calificación ya venció.</p>
          ) : null}

          {/* Devolución (RF-49/5.4): con solicitud PENDIENTE se informa el
              estado en revisión; sin ella y dentro de la ventana de 7 días
              se ofrece el CTA que despliega el formulario inline. Fuera de
              la ventana no se muestra nada para no duplicar mensajes con la
              calificación. */}
          {compra.solicitudPendienteId ? (
            <Insignia tono="advertencia" className="self-start">
              Solicitud de devolución en revisión
            </Insignia>
          ) : devolucionable ? (
            <BotonSolicitarDevolucion compraId={compra.id} />
          ) : null}
        </div>
      ) : null}
    </Tarjeta>
  );
}
