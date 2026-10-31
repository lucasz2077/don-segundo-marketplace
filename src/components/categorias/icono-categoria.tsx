import { createElement } from "react";
import {
  Beef,
  Cog,
  Package,
  Sprout,
  Tractor,
  Truck,
  Wrench,
  type LucideIcon,
  type LucideProps,
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

/**
 * Ícono de una categoría como componente. Se instancia con createElement para
 * no declarar un componente durante el render (regla del React Compiler).
 */
export function IconoCategoria({ slug, ...props }: LucideProps & { slug: string }) {
  return createElement(iconoCategoria(slug), { "aria-hidden": true, ...props });
}
