import {
  BadgeCheck,
  Bell,
  Heart,
  House,
  IdCard,
  MapPin,
  MessageCircle,
  Package,
  ShoppingBag,
  Store,
  Undo2,
  type LucideIcon,
} from "lucide-react";

export type EnlaceCuenta = {
  href: string;
  etiqueta: string;
  descripcion: string;
  icono: LucideIcon;
};

export type GrupoCuenta = {
  titulo: string;
  enlaces: EnlaceCuenta[];
};

/**
 * Secciones del área "Mi cuenta": alimentan la navegación lateral (desktop)
 * y el índice de /perfil (mobile), para que nombres y rutas no diverjan.
 */
export const GRUPOS_CUENTA: GrupoCuenta[] = [
  {
    titulo: "Compras",
    enlaces: [
      {
        href: "/compras",
        etiqueta: "Mis compras",
        descripcion: "Estado del pago, calificaciones y devoluciones.",
        icono: ShoppingBag,
      },
      {
        href: "/favoritos",
        etiqueta: "Favoritos",
        descripcion: "Las publicaciones que guardaste.",
        icono: Heart,
      },
    ],
  },
  {
    titulo: "Ventas",
    enlaces: [
      {
        href: "/perfil/publicaciones",
        etiqueta: "Mis publicaciones",
        descripcion: "Stock, vendidas, pausar y editar.",
        icono: Package,
      },
      {
        href: "/perfil/devoluciones",
        etiqueta: "Devoluciones",
        descripcion: "Solicitudes de devolución de tus ventas.",
        icono: Undo2,
      },
      {
        href: "/perfil/verificacion",
        etiqueta: "Verificación de vendedor",
        descripcion: "Sumá el sello de vendedor verificado.",
        icono: BadgeCheck,
      },
    ],
  },
  {
    titulo: "Actividad",
    enlaces: [
      {
        href: "/mensajes",
        etiqueta: "Mensajes",
        descripcion: "Tus conversaciones con compradores y vendedores.",
        icono: MessageCircle,
      },
      {
        href: "/notificaciones",
        etiqueta: "Notificaciones",
        descripcion: "Avisos de compras, mensajes y publicaciones.",
        icono: Bell,
      },
    ],
  },
  {
    titulo: "Mis datos",
    enlaces: [
      {
        href: "/perfil/informacion",
        etiqueta: "Información personal",
        descripcion: "Nombre, DNI, tipo de cuenta y contraseña.",
        icono: IdCard,
      },
      {
        href: "/perfil/direcciones",
        etiqueta: "Direcciones",
        descripcion: "Tus direcciones de entrega.",
        icono: MapPin,
      },
      {
        href: "/perfil/publico",
        etiqueta: "Perfil público",
        descripcion: "Bio y nombre comercial que ven los compradores.",
        icono: Store,
      },
    ],
  },
];

export const ENLACE_RESUMEN: EnlaceCuenta = {
  href: "/perfil",
  etiqueta: "Resumen",
  descripcion: "Tu cuenta de un vistazo.",
  icono: House,
};
