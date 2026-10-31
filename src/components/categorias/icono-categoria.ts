import {
  Beef,
  Cog,
  Package,
  Sprout,
  Tractor,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Ícono de cada categoría raíz del seed (prisma/seed.ts), por slug. */
const ICONOS_POR_SLUG: Record<string, LucideIcon> = {
  "maquinaria-agricola": Tractor,
  "herramientas-equipos": Wrench,
  insumos: Sprout,
  "hacienda-ganado": Beef,
  repuestos: Cog,
  "servicios-rurales": Truck,
  otros: Package,
};

/**
 * Ícono de lucide para una categoría. Las categorías sin ícono propio (p. ej.
 * una raíz nueva cargada desde la base) usan el genérico de paquete.
 */
export function iconoCategoria(slug: string): LucideIcon {
  return ICONOS_POR_SLUG[slug] ?? Package;
}
