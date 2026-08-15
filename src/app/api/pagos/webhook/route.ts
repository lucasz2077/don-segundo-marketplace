import { NextResponse } from "next/server";

import { aprobarPagoCompra } from "@/lib/compras";
import { verificarFirmaMp, verificarPago } from "@/lib/pagos/pagos";
import { webhookPagoSchema } from "@/lib/validation/pagos";

/**
 * Webhook de notificaciones de pago de Mercado Pago (RF-46, RNF-16..18).
 *
 * Reglas:
 * - Ruta PÚBLICA (MP no manda sesión): la confianza viene de la firma
 *   `x-signature`, no de autenticación.
 * - Con MP_WEBHOOK_SECRET configurado (producción), se valida la firma
 *   HMAC-SHA256 (ts/v1) vía `verificarFirmaMp` (RNF-16). Sin secret
 *   configurado (dev) se procesa igual, pero nunca se loguea el secret.
 * - Solo se procesan pagos `approved` con `external_reference` (RF-46).
 * - SIEMPRE respondemos 200: si MP recibe 5xx reintenta y eso rompe la
 *   idempotencia de `aprobarPagoCompra`. Los errores internos se loguean
 *   y quedan visibles en el observability del servidor.
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

  let pago;
  try {
    pago = await verificarPago(data.id);
  } catch (error) {
    // Error llamando a la API de MP: no es culpa del caller. Mismo
    // criterio que abajo: 200 y log para que el reintento no duplique.
    console.error("PAGO_VERIFICACION_FALLIDA", data.id, error);
    return NextResponse.json({ data: { recibido: true } });
  }

  // Solo los pagos aprobados cierran la compra (RF-46). Los demás (pending,
  // rejected, cancelled...) se ignoran; MP nos volverá a avisar si cambia.
  if (pago && pago.status === "approved") {
    try {
      await aprobarPagoCompra({
        externalReference: pago.externalReference,
        pago,
      });
    } catch (error) {
      console.error("APROBAR_PAGO_FALLIDA", pago.externalReference, error);
    }
  }

  return NextResponse.json({ data: { recibido: true } });
}