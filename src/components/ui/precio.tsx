import { unirClases } from "./unir-clases";

type Moneda = "ARS" | "USD";
type TamanioPrecio = "sm" | "md" | "lg" | "xl";

const SIMBOLOS: Record<Moneda, string> = {
  ARS: "$",
  USD: "US$",
};

const NOMBRES_MONEDA: Record<Moneda, string> = {
  ARS: "pesos",
  USD: "dólares",
};

const formateadorEntero = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

const estilosPorTamanio: Record<TamanioPrecio, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl sm:text-4xl",
};

/**
 * Separa un monto en parte entera formateada (es-AR, con puntos de miles) y
 * centavos de dos dígitos, o null si no tiene centavos. Trabaja sobre el
 * string del Decimal para no introducir errores de float.
 */
export function partesPrecio(precio: { toString(): string } | number): {
  entero: string;
  centavos: string | null;
} {
  const texto =
    typeof precio === "number" ? precio.toFixed(2) : precio.toString();
  const [parteEntera, parteDecimal = ""] = texto.split(".");
  // Decimal(12,2): a lo sumo dos decimales; se completan con ceros.
  const centavos = `${parteDecimal}00`.slice(0, 2);
  return {
    entero: formateadorEntero.format(BigInt(parteEntera)),
    centavos: centavos === "00" ? null : centavos,
  };
}

type PrecioProps = {
  precio: { toString(): string } | number;
  moneda: Moneda;
  tamanio?: TamanioPrecio;
  className?: string;
};

/**
 * Precio protagonista de tarjetas y detalle, estilo marketplace: símbolo de
 * moneda ("$" o "US$"), miles con punto y centavos en superíndice solo cuando
 * existen. Para lectores de pantalla se anuncia el monto completo con el
 * nombre de la moneda ("1.200.000 pesos").
 */
export function Precio({
  precio,
  moneda,
  tamanio = "md",
  className,
}: PrecioProps) {
  const { entero, centavos } = partesPrecio(precio);
  const textoAccesible = `${entero}${centavos ? `,${centavos}` : ""} ${NOMBRES_MONEDA[moneda]}`;

  return (
    <p
      className={unirClases(
        "font-normal leading-none tracking-tight text-tinta tabular-nums",
        estilosPorTamanio[tamanio],
        className,
      )}
    >
      <span className="sr-only">{textoAccesible}</span>
      <span aria-hidden="true" className="inline-flex items-start gap-1">
        <span>{SIMBOLOS[moneda]}</span>
        <span>{entero}</span>
        {centavos ? (
          // Valor arbitrario justificado: los centavos escalan con el tamaño
          // del precio (mitad de su cuerpo), no con un paso fijo de la escala.
          <span className="mt-0.5 text-[0.5em] leading-none">{centavos}</span>
        ) : null}
      </span>
    </p>
  );
}
