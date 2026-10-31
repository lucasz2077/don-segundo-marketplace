import {
  BadgeCheck,
  Bell,
  Flag,
  Heart,
  LayoutGrid,
  MessageCircle,
  Package,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Undo2,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type EnlaceNavegacion = {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
};

/**
 * Destinos de navegación del sitio, compartidos por el menú de usuario, el
 * menú mobile y el footer para que los textos y rutas no diverjan.
 */
export const ENLACES_COMPRAR: EnlaceNavegacion[] = [
  { href: "/listados", etiqueta: "Explorar publicaciones", icono: LayoutGrid },
  { href: "/favoritos", etiqueta: "Favoritos", icono: Heart },
  { href: "/compras", etiqueta: "Mis compras", icono: ShoppingBag },
];

export const ENLACES_VENDER: EnlaceNavegacion[] = [
  { href: "/publicar", etiqueta: "Publicar", icono: Tag },
  { href: "/perfil/publicaciones", etiqueta: "Mis publicaciones", icono: Package },
  { href: "/perfil/devoluciones", etiqueta: "Devoluciones", icono: Undo2 },
  { href: "/perfil/verificacion", etiqueta: "Verificación de vendedor", icono: BadgeCheck },
];

export const ENLACES_CUENTA: EnlaceNavegacion[] = [
  { href: "/perfil", etiqueta: "Mi perfil", icono: UserRound },
  { href: "/mensajes", etiqueta: "Mensajes", icono: MessageCircle },
  { href: "/notificaciones", etiqueta: "Notificaciones", icono: Bell },
];

/** Solo visibles con el claim ADMIN (la página re-chequea el rol). */
export const ENLACES_ADMIN: EnlaceNavegacion[] = [
  { href: "/admin/reportes", etiqueta: "Reportes", icono: Flag },
  { href: "/admin/verificaciones", etiqueta: "Verificaciones", icono: ShieldCheck },
];
