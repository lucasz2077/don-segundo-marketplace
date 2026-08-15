import { Preference } from "mercadopago";
import { Prisma } from "@/generated/prisma/client";
import type { Compra, VendedorMpAccount } from "@/generated/prisma/client";
import { aCentavos, clienteMpVendedor } from "@/lib/pagos/mp";

/** Fallo al crear la preferencia de pago en MP → 502 PAGO_INDISPONIBLE (RF-39). */
export class PreferenciaFallidaError extends Error {
  constructor(causa?: unknown) {
    super("No se pudo crear la preferencia de pago en Mercado Pago", { cause: causa });
    this.name = "PreferenciaFallidaError";
  }
}

/** Compra mínima necesaria para armar la preferencia (RF-39, D6). */
export type CompraParaPreferencia = Pick<
  Compra,
  "id" | "listingId" | "precioUnitario" | "currency" | "cantidad" | "fechaVencimiento"
> & {
  // D6: el fee se persiste SIEMPRE en Compra (precio de negocio), nunca null.
  marketplaceFee: Prisma.Decimal;
};

/** URL base de back_urls/notification_url (RF-39/D7). */
function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "";
}

/**
 * Crea la preferencia de Checkout Pro con el COLLECTOR del vendedor (RF-39,
 * D6): el dinero acredita en la cuenta MP del vendedor; la plataforma cobra
 * `marketplace_fee` (centavos, aCentavos sin float — RNF-19). La orden expira
 * al mismo `fechaVencimiento` (TTL D5): MP no acredita pagos vencidos.
 * Lanza `PreferenciaFallidaError` si MP rechaza (502).
 */
export async function crearPreferenciaPago({
  compra,
  vendedorMp,
}: {
  compra: CompraParaPreferencia;
  vendedorMp: Pick<VendedorMpAccount, "accessToken">;
}): Promise<{ initPoint: string }> {
  const base = appUrl();
  // MP rechaza `auto_return: "approved"` (400 invalid_auto_return) salvo que la
  // URL de back_urls sea https. En dev (http://localhost) se omite y el usuario
  // vuelve manualmente; en producción (https) el retorno automático queda activo.
  const autoReturn = base.startsWith("https://") ? ("approved" as const) : undefined;
  const preference = new Preference(clienteMpVendedor(vendedorMp));

  try {
    const respuesta = await preference.create({
      body: {
        items: [
          {
            id: compra.listingId,
            title: compra.id,
            quantity: compra.cantidad,
            unit_price: aCentavos(compra.precioUnitario),
            currency_id: compra.currency,
          },
        ],
        external_reference: compra.id,
        back_urls: {
          success: `${base}/pagos/resultado?compra=${compra.id}&estado=success`,
          failure: `${base}/pagos/resultado?compra=${compra.id}&estado=failure`,
          pending: `${base}/pagos/resultado?compra=${compra.id}&estado=pending`,
        },
        marketplace_fee: aCentavos(compra.marketplaceFee),
        auto_return: autoReturn,
        expires: true,
        date_of_expiration: compra.fechaVencimiento?.toISOString(),
        notification_url: `${base}/api/pagos/webhook`,
      },
    });

    const initPoint = respuesta.init_point;
    if (!initPoint) {
      throw new PreferenciaFallidaError(new Error("MP no devolvió init_point"));
    }
    return { initPoint };
  } catch (error) {
    if (error instanceof PreferenciaFallidaError) throw error;
    throw new PreferenciaFallidaError(error);
  }
}