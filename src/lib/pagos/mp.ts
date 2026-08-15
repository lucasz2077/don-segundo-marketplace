import { MercadoPagoConfig } from "mercadopago";
import { Prisma } from "@/generated/prisma/client";
import type { VendedorMpAccount } from "@/generated/prisma/client";

/**
 * Cuota que cobra la plataforma por cada venta (D6). Se persiste SIEMPRE en
 * `Compra.marketplaceFee` (precio de negocio); el vendedor la absorbe según
 * RF-51. Nunca hardcodeada por ruta: único punto de definición.
 */
export const FEE_MARKETPLACE = 0.05;

const globalForMp = globalThis as unknown as {
  clienteMpApp: MercadoPagoConfig | undefined;
};

/**
 * Cliente de Mercado Pago con el token de la APLICACIÓN (MP_ACCESS_TOKEN,
 * server-side, RNF-20). Singleton: solo se crea una instancia por proceso
 * (verificaciones de webhook, refunds SIN_STOCK, OAuth).
 */
export function clienteMpApp(): MercadoPagoConfig {
  if (!globalForMp.clienteMpApp) {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("MP_ACCESS_TOKEN no está configurado");
    }
    globalForMp.clienteMpApp = new MercadoPagoConfig({ accessToken });
  }
  return globalForMp.clienteMpApp;
}

/**
 * Cliente de Mercado Pago con el token del VENDEDOR vinculado (OAuth, RF-47).
 * Cada preferencia de pago se crea con el collector del vendedor para que el
 * dinero acredite en SU cuenta de MP; el token nunca sale del servidor.
 */
export function clienteMpVendedor(vendedorMp: Pick<VendedorMpAccount, "accessToken">): MercadoPagoConfig {
  return new MercadoPagoConfig({ accessToken: vendedorMp.accessToken });
}

/**
 * Convierte un monto `Prisma.Decimal` (2 decimales) a entero de CENTAVOS sin
 * pasar por float (RNF-19): `Decimal × 100 → round → number` entero. ML · MP
 * esperan montos en la menor unidad de la moneda (ARS → centavos).
 */
export function aCentavos(precio: Prisma.Decimal): number {
  const centavos = precio.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  return centavos.toNumber();
}

/**
 * Fee de la plataforma sobre el precio (FEE_MARKETPLACE, D6). Devuelve un
 * `Prisma.Decimal(12,2)` con redondeo HALF_UP; `aCentavos` lo pasa a centavos
 * para MP. Aritmética exacta (decimal.js), nunca float.
 */
export function calcularFee(precio: Prisma.Decimal): Prisma.Decimal {
  const fee = precio.mul(new Prisma.Decimal(FEE_MARKETPLACE));
  // toFixed(2) normaliza la escala (ej. 50 → "50.00") además de redondear;
  // patrón de listings.ts para montos persistibles DECIMAL(12,2).
  return new Prisma.Decimal(fee.toFixed(2));
}