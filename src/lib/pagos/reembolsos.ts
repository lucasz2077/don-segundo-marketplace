import { PaymentRefund } from "mercadopago";
import type { Compra } from "@/generated/prisma/client";
import { clienteMpApp } from "@/lib/pagos/mp";

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
 * de lo pagado y el vendedor absorbe el marketplace_fee y costos del gateway
 * (por eso se usa `total()`, sin monto parcial). El refund se ejecuta con el
 * token de la APP. Devuelve el id del refund en MP para trazabilidad.
 */
export async function reembolsarCompra({
  compra,
}: {
  compra: CompraParaReembolso;
}): Promise<{ mpRefundId: number | string }> {
  if (!compra.mpPaymentId) {
    throw new ReembolsoFallidoError(new Error("La compra no tiene mpPaymentId"));
  }

  const refund = new PaymentRefund(clienteMpApp());

  try {
    const respuesta = await refund.total({ payment_id: compra.mpPaymentId });
    if (!respuesta.id) {
      throw new ReembolsoFallidoError(new Error("MP no devolvió id de refund"));
    }
    return { mpRefundId: respuesta.id };
  } catch (error) {
    if (error instanceof ReembolsoFallidoError) throw error;
    throw new ReembolsoFallidoError(error);
  }
}