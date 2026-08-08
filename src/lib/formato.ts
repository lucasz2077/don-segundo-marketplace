/** Tipos de moneda soportados por el modelo Listing. */
export type Moneda = "ARS" | "USD";

const formateadorArs = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formateadorUsd = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formatea un precio según la moneda, con formato local argentino.
 * Ejemplos: "$ 1.200.000 ARS" | "USD 15.000".
 */
export function formatearPrecio(
  precio: { toString(): string } | number,
  moneda: Moneda
): string {
  const numero = typeof precio === "number" ? precio : Number(precio);
  const monto =
    moneda === "USD" ? formateadorUsd.format(numero) : formateadorArs.format(numero);
  return moneda === "ARS" ? `$ ${monto} ARS` : `USD ${monto}`;
}
