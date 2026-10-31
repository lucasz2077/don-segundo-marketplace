import { EsqueletoCuenta } from "@/components/ui/esqueletos";

/**
 * Estado de carga de /compras (E3): esqueletos con la forma del área "Mi
 * cuenta" mientras el RSC resuelve la sesión y la consulta.
 */
export default function CargandoCompras() {
  return <EsqueletoCuenta texto="Cargando tus compras..." />;
}
