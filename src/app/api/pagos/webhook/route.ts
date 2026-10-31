import { NextResponse } from "next/server";
import { z } from "zod";

import { procesarNotificacionPago } from "@/lib/compras";
import { verificarFirmaMp } from "@/lib/pagos/pagos";
import { webhookPagoSchema } from "@/lib/validation/pagos";

/**
 * Webhook de notificaciones de pago de Mercado Pago (RF-43..RF-46, RNF-16..18).
 *
 * Reglas:
 * - Ruta PÚBLICA (MP no manda sesión): la confianza viene de la firma
 *   `x-signature` y de re-consultar el pago en MP, no de autenticación.
 * - Con MP_WEBHOOK_SECRET configurado (producción), se valida la firma
 *   HMAC-SHA256 (ts/v1) vía `verificarFirmaMp` (RNF-16). Sin secret
 *   configurado (dev) se procesa igual, pero nunca se loguea el secret.
 * - `?compra=<id>` (lo agrega la preferencia) indica con qué token consultar
 *   el pago; `procesarNotificacionPago` lo re-verifica contra MP.
 * - Si el procesamiento falla (MP o la base no responden) se responde 500
 *   para que MP reintente: la aprobación es idempotente (RNF-17), así que un
 *   reintento nunca duplica efectos. Lo ya procesado o ajeno responde 200.
 */
export async function POST(req: Request) {
  const secret = process.env.MP_WEBHOOK_SECRET ?? "";

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "CUERPO_INVALIDO", message: "Cuerpo inválido" } },
      { status: 400 }
    );
  }

  const parseado = webhookPagoSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return NextResponse.json(
      { error: { code: "CUERPO_INVALIDO", message: "Cuerpo inválido" } },
      { status: 400 }
    );
  }

  const { data } = parseado.data;

  if (secret) {
    const firmaValida = verificarFirmaMp({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId: data.id,
      secret,
    });
    if (!firmaValida) {
      return NextResponse.json(
        { error: { code: "FIRMA_INVALIDA", message: "Firma inválida" } },
        { status: 401 }
      );
    }
  }

  const compraParam = new URL(req.url).searchParams.get("compra");
  const compraId = z.uuid().safeParse(compraParam).success ? compraParam : null;

  try {
    await procesarNotificacionPago({ mpPaymentId: data.id, compraId });
  } catch (error) {
    console.error("PAGO_PROCESAMIENTO_FALLIDO", data.id, compraId, error);
    return NextResponse.json(
      { error: { code: "ERROR_INTERNO", message: "No se pudo procesar el pago" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { recibido: true } });
}
