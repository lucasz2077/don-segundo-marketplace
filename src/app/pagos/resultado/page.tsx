import {
  CircleCheck,
  CircleX,
  Clock,
  RotateCcw,
  SearchX,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { Contenedor } from "@/components/ui/contenedor";
import { Tarjeta } from "@/components/ui/tarjeta";
import { unirClases } from "@/components/ui/unir-clases";

export const dynamic = "force-dynamic";

type TonoResultado = "exito" | "espera" | "info" | "error";

const ESTILO_TONO: Record<TonoResultado, string> = {
  exito: "bg-success/10 text-success",
  espera: "bg-warning/10 text-warning-fuerte",
  info: "bg-brand-50 text-brand-700",
  error: "bg-danger/10 text-danger",
};

type Resultado = {
  icono: LucideIcon;
  tono: TonoResultado;
  titulo: string;
  descripcion: string;
  accion: { href: string; etiqueta: string };
};

/**
 * Resultado del Checkout Pro de Mercado Pago (back_urls, RF-39/D7). Página
 * PÚBLICA: es el destino al que MP redirige al comprador tras el pago, así que
 * no exige sesión. Lee el estado REAL de la Compra desde la DB
 * (RNF-16: nunca confía en el `estado` de la query string) y muestra un
 * resumen del resultado: APROBADO/REEMBOLSADO, REEMBOLSO_PENDIENTE (pago a
 * devolver porque se agotó), PENDIENTE que se confirma por webhook, o
 * FALLIDO/EXPIRADA con acceso a reintentar desde la publicación.
 */
export default async function ResultadoPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ compra?: string }>;
}) {
  const { compra: compraId } = await searchParams;

  const compra = compraId
    ? await prisma.compra.findUnique({
        where: { id: compraId },
        select: {
          id: true,
          estadoPago: true,
          motivoReembolso: true,
          listing: { select: { id: true, title: true } },
        },
      })
    : null;

  return (
    <Contenedor as="main" className="flex flex-1 items-start justify-center py-8 sm:items-center sm:py-12">
      <PanelResultado resultado={resolverResultado(compraId, compra)} />
    </Contenedor>
  );
}

type CompraResultado = {
  estadoPago: string;
  motivoReembolso: string | null;
  listing: { id: string; title: string };
} | null;

function resolverResultado(compraId: string | undefined, compra: CompraResultado): Resultado {
  if (!compraId) {
    return {
      icono: SearchX,
      tono: "info",
      titulo: "No encontramos tu compra",
      descripcion:
        "Falta el identificador del pago en el enlace. Revisá el vínculo que te envió Mercado Pago o buscá la compra en Mis compras.",
      accion: { href: "/listados", etiqueta: "Explorar publicaciones" },
    };
  }

  if (!compra) {
    return {
      icono: SearchX,
      tono: "info",
      titulo: "Compra no encontrada",
      descripcion:
        "No pudimos validar la compra del enlace. Si el pago se concretó, la vas a ver en Mis compras en unos minutos.",
      accion: { href: "/compras", etiqueta: "Ir a mis compras" },
    };
  }

  const titulo = `“${compra.listing.title}”`;

  switch (compra.estadoPago) {
    case "APROBADO":
      return {
        icono: CircleCheck,
        tono: "exito",
        titulo: "¡Pago aprobado!",
        descripcion: `Recibimos el pago de ${titulo}. Le avisamos al vendedor y vas a poder calificar la venta desde Mis compras.`,
        accion: { href: "/compras", etiqueta: "Ver mis compras" },
      };
    case "REEMBOLSADO":
      return {
        icono: RotateCcw,
        tono: "info",
        titulo: "Compra reembolsada",
        descripcion: `Tu compra de ${titulo} fue reembolsada${
          compra.motivoReembolso === "SIN_STOCK"
            ? " porque la publicación se agotó antes de confirmarse"
            : " por el vendedor"
        }. El dinero vuelve al medio de pago original.`,
        accion: { href: "/compras", etiqueta: "Ver mis compras" },
      };
    case "REEMBOLSO_PENDIENTE":
      return {
        icono: RotateCcw,
        tono: "espera",
        titulo: "Te vamos a devolver el pago",
        descripcion: `${titulo} se agotó antes de que se confirmara tu pago. Ya estamos gestionando la devolución con Mercado Pago: el dinero vuelve al medio de pago original.`,
        accion: { href: "/compras", etiqueta: "Ver mis compras" },
      };
    case "PENDIENTE":
      return {
        icono: Clock,
        tono: "espera",
        titulo: "Pago pendiente",
        descripcion: `Estamos esperando la confirmación de Mercado Pago para ${titulo}. Puede tardar unos minutos: el estado final aparece en Mis compras.`,
        accion: { href: "/compras", etiqueta: "Ir a mis compras" },
      };
    default:
      return {
        icono: CircleX,
        tono: "error",
        titulo: "El pago no se completó",
        descripcion: `El pago de ${titulo} no se concretó. Podés volver a intentarlo desde la publicación.`,
        accion: { href: `/listados/${compra.listing.id}`, etiqueta: "Volver a la publicación" },
      };
  }
}

function PanelResultado({ resultado }: { resultado: Resultado }) {
  const { icono: Icono, tono, titulo, descripcion, accion } = resultado;
  return (
    <Tarjeta as="section" relleno="ninguno" className="w-full max-w-md p-6 text-center sm:p-8">
      <span
        className={unirClases(
          "mx-auto flex size-16 items-center justify-center rounded-full",
          ESTILO_TONO[tono],
        )}
      >
        <Icono className="size-8" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-tinta">{titulo}</h1>
      <p className="mt-2 text-sm leading-relaxed text-tinta-suave">{descripcion}</p>
      <div className="mt-6 flex flex-col gap-2">
        <BotonEnlace href={accion.href} tamanio="lg" anchoCompleto>
          {accion.etiqueta}
        </BotonEnlace>
        <BotonEnlace href="/" variante="fantasma" anchoCompleto>
          Volver al inicio
        </BotonEnlace>
      </div>
    </Tarjeta>
  );
}
