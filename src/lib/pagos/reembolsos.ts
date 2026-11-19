import { PaymentRefund } from "mercadopago";
import type { Compra } from "@/generated/prisma/client";
import { clienteMpApp, clienteMpVendedor } from "@/lib/pagos/mp";

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
 * True si MP rechazó el refund porque esa credencial no puede operar el pago
 * (401/403/404). Visto en la prueba de punta a punta: con el token del
 * vendedor, MP respondió 404 "Payment not found" sobre un pago aprobado.
 */
function esRechazoDeCredencial(error: unknown): boolean {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: unknown }).status
      : undefined;
  return status === 401 || status === 403 || status === 404;
}

/**
 * Reembolso TOTAL de un pago aprobado (RF-51/D4): el comprador recibe el 100%
 * de lo pagado; MP descuenta la devolución en proporción a lo que cobró cada
 * parte (vendedor y `marketplace_fee` de la plataforma). Se intenta primero
 * con el token del VENDEDOR (collector) y, si MP responde que esa credencial
 * no puede operar el pago (401/403/404), con el de la APP (marketplace). Un
 * error transitorio no se reintenta con otra credencial. `idempotencia`
 * identifica la operación de negocio y es la misma en ambos intentos, así que
 * reintentar nunca duplica el refund. Devuelve el id del refund en MP.
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
  const mpPaymentId = compra.mpPaymentId;
  if (!mpPaymentId) {
    throw new ReembolsoFallidoError(new Error("La compra no tiene mpPaymentId"));
  }

  const reembolsarCon = async (refund: PaymentRefund) => {
    const respuesta = await refund.total({
      payment_id: mpPaymentId,
      requestOptions: { idempotencyKey: idempotencia },
    });
    if (!respuesta.id) {
      throw new ReembolsoFallidoError(new Error("MP no devolvió id de refund"));
    }
    return { mpRefundId: respuesta.id };
  };

  try {
    return await reembolsarCon(
      new PaymentRefund(clienteMpVendedor({ accessToken: accessTokenVendedor }))
    );
  } catch (errorVendedor) {
    if (errorVendedor instanceof ReembolsoFallidoError) throw errorVendedor;
    if (!esRechazoDeCredencial(errorVendedor)) {
      throw new ReembolsoFallidoError(errorVendedor);
    }

    console.error("REEMBOLSO_TOKEN_VENDEDOR_RECHAZADO", {
      compraId: compra.id,
      error: errorVendedor,
    });
    try {
      return await reembolsarCon(new PaymentRefund(clienteMpApp()));
    } catch (errorApp) {
      if (errorApp instanceof ReembolsoFallidoError) throw errorApp;
      throw new ReembolsoFallidoError(errorApp);
    }
  }
}
