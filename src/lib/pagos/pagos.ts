import { Payment } from "mercadopago";
import { Prisma } from "@/generated/prisma/client";
import { clienteMpApp } from "@/lib/pagos/mp";

/** Pago verificado server-side contra la API de MP (RNF-16). */
export type PagoVerificado = {
  id: string | number;
  status: string;
  externalReference: string;
  transactionAmount: Prisma.Decimal;
  currencyId: string;
  paymentMethodId: string | undefined;
};

/**
 * Confirma un pago en Mercado Pago (Payment.get) con el token de la APP —
 * nunca se confía en el body del webhook (solo aporta `data.id`, RNF-16).
 * Devuelve null si el pago no tiene `external_reference` (no relacionado con
 * una compra de la plataforma); lanza si MP falla.
 */
export async function verificarPago(
  mpPaymentId: string | number
): Promise<PagoVerificado | null> {
  const payment = new Payment(clienteMpApp());
  const pago = await payment.get({ id: mpPaymentId });

  if (!pago.external_reference) return null;

  return {
    id: pago.id ?? mpPaymentId,
    status: pago.status ?? "",
    externalReference: pago.external_reference,
    // toFixed(2) normaliza la escala: 0.1 → "0.10" (Decimal exacto, RNF-19).
    transactionAmount: new Prisma.Decimal(
      (pago.transaction_amount ?? 0).toFixed(2)
    ),
    currencyId: pago.currency_id ?? "",
    paymentMethodId: pago.payment_method_id,
  };
}