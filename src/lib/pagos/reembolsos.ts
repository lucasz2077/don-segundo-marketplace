import { PaymentRefund } from "mercadopago";
import type { Compra } from "@/generated/prisma/client";
import { clienteMpVendedor } from "@/lib/pagos/mp";

/** Fallo al reembolsar en MP → 502 PAGO_INDISPONIBLE (RF-49/D4). */
export class ReembolsoFallidoError extends Error {
  constructor(causa?: unknown) {
    super("No se pudo reembolsar el pago en Mercado Pago", { cause: causa });
    this.name = "ReembolsoFallidoError";
  }
}

/** Compra mínima para reembolsar (aprobada con mpPaymentId). */
export type CompraParaReembolso = Pick<Compra, "id" | "mpPaymentId">;

/**
 * Reembolso TOTAL de un pago aprobado (RF-51/D4): el comprador recibe el 100%
 * de lo pagado; MP descuenta la devolución en proporción a lo que cobró cada
 * parte (vendedor y `marketplace_fee` de la plataforma). Se ejecuta con el
 * token del VENDEDOR, dueño del pago (collector). `idempotencia` identifica la
 * operación de negocio: reintentar con la misma clave no duplica el refund.
 * Devuelve el id del refund en MP para trazabilidad.
 */
export async function reembolsarCompra({
  compra,
  accessTokenVendedor,
  idempotencia,
}: {
  compra: CompraParaReembolso;
  accessTokenVendedor: string;
  idempotencia: string;
}): Promise<{ mpRefundId: number | string }> {
  if (!compra.mpPaymentId) {
    throw new ReembolsoFallidoError(new Error("La compra no tiene mpPaymentId"));
  }

  const refund = new PaymentRefund(
    clienteMpVendedor({ accessToken: accessTokenVendedor })
  );

  try {
    const respuesta = await refund.total({
      payment_id: compra.mpPaymentId,
      requestOptions: { idempotencyKey: idempotencia },
    });
    if (!respuesta.id) {
      throw new ReembolsoFallidoError(new Error("MP no devolvió id de refund"));
    }
    return { mpRefundId: respuesta.id };
  } catch (error) {
    if (error instanceof ReembolsoFallidoError) throw error;
    throw new ReembolsoFallidoError(error);
  }
}
