import Link from "next/link";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Resultado del Checkout Pro de Mercado Pago (back_urls, RF-39/D7). Página
 * PÚBLICA: es el destino al que MP redirige al comprador tras el pago, así que
 * no exige sesión. Lee el estado REAL de la Compra desde la DB
 * (RNF-16: nunca confía en el `estado` de la query string) y muestra un
 * resumen del resultado: APROBADO/REEMBOLSADO con ticket, PENDIENTE que se
 * confirma por webhook, o FALLIDO con botón a reintentar.
 */
export default async function ResultadoPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ compra?: string }>;
}) {
  const { compra: compraId } = await searchParams;

  if (!compraId) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <Panel
          titulo="No encontramos tu compra"
          descripcion="Falta el identificador del pago en la URL. Revisá el vínculo que te envió Mercado Pago e intentá de nuevo."
          cta={
            <Link
              href="/listados"
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Explorar publicaciones
            </Link>
          }
        />
      </main>
    );
  }

  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    select: {
      id: true,
      estadoPago: true,
      motivoReembolso: true,
      listing: { select: { id: true, title: true } },
    },
  });

  if (!compra) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <Panel
          titulo="Compra no encontrada"
          descripcion="No pudimos validar la compra que indica el vínculo. Si el pago se concretó, vas a recibir la confirmación por webhook en tu lista de compras."
          cta={
            <Link
              href="/compras"
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Ir a mis compras
            </Link>
          }
        />
      </main>
    );
  }

  const estado = compra.estadoPago;

  if (estado === "APROBADO") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <Panel
          titulo="¡Pago aprobado!"
          descripcion={`Recibimos el pago de "${compra.listing.title}". El vendedor fue notificado y en breve vas a poder calificar la venta desde Mis compras.`}
          destacado
          cta={
            <Link
              href="/compras"
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Ver mis compras
            </Link>
          }
        />
      </main>
    );
  }

  if (estado === "REEMBOLSADO") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <Panel
          titulo="Compra reembolsada"
          descripcion={`Tu compra de "${compra.listing.title}" fue reembolsada${compra.motivoReembolso === "SIN_STOCK" ? " porque la publicación se agotó antes de confirmarse" : " por el vendedor"}. El crédito vuelve al medio de pago original.`}
          cta={
            <Link
              href="/compras"
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Ver mis compras
            </Link>
          }
        />
      </main>
    );
  }

  if (estado === "PENDIENTE") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <Panel
          titulo="Pago pendiente"
          descripcion={`Estamos esperando la confirmación de Mercado Pago para "${compra.listing.title}". Puede tardar unos minutos; actualizá Mis compras para ver el estado final.`}
          cta={
            <Link
              href="/compras"
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Ir a mis compras
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <Panel
        titulo="El pago no se completó"
        descripcion={`Parece que el pago de "${compra.listing.title}" no se concretó. Podés volver a intentarlo desde la publicación.`}
        cta={
          <Link
            href={`/listados/${compra.listing.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Ver publicación
          </Link>
        }
      />
    </main>
  );
}

function Panel({
  titulo,
  descripcion,
  cta,
  destacado = false,
}: {
  titulo: string;
  descripcion: string;
  cta: React.ReactNode;
  destacado?: boolean;
}) {
  return (
    <section
      className={`rounded-control border p-6 ${
        destacado
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
          : "border-sand-200 bg-white dark:border-sand-800 dark:bg-sand-950"
      }`}
    >
      <h1 className="text-2xl font-semibold text-brand-900 dark:text-bone">
        {titulo}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-sand-700 dark:text-sand-300">
        {descripcion}
      </p>
      <div className="mt-5">{cta}</div>
    </section>
  );
}