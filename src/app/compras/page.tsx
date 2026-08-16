import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  compraEnVentanaCalificacion,
  compraEnVentanaDevolucion,
  obtenerMisCompras,
} from "@/lib/compras";
import { TarjetaCompra } from "@/components/compras/tarjeta-compra";
import { EstadoVacio } from "@/components/ui/estado-vacio";

export const dynamic = "force-dynamic";

/**
 * "Mis compras" (RF-29, D7): RSC server-rendered con sesión obligatoria —
 * sin sesión redirige a /sign-in (patrón dashboard). Lista las compras del
 * usuario con una sola consulta (sin N+1) y muestra el CTA "Calificar" solo
 * en compras con pago APROBADO (RF-41/D9), dentro de los 30 días desde la
 * aprobación del pago (D9, 6.6: la ventana se ancla a `aprobadoAt`) y sin
 * rating. El CTA "Solicitar devolución" (RF-49/5.4) aparece solo en compras
 * APROBADAS dentro de la ventana de 7 días desde la aprobación y sin
 * solicitud PENDIENTE; con una solicitud en curso la tarjeta informa "en
 * revisión". El estado de pago se exhibe siempre en la tarjeta. Estados:
 * vacío con CTA a explorar publicaciones (E3).
 */
export default async function ComprasPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const compras = await obtenerMisCompras(session.user.id);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold text-brand-900 dark:text-bone">
        Mis compras
      </h1>

      {compras.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-4">
          {compras.map((compra) => (
            <li key={compra.id}>
              <TarjetaCompra
                compra={compra}
                calificable={
                  !compra.rating &&
                  compra.estadoPago === "APROBADO" &&
                  compraEnVentanaCalificacion(compra.aprobadoAt)
                }
                devolucionable={
                  compra.estadoPago === "APROBADO" &&
                  !compra.solicitudPendienteId &&
                  compraEnVentanaDevolucion(compra.aprobadoAt)
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EstadoVacio
            titulo="Todavía no compraste nada"
            descripcion="Cuando compres una publicación, aparece acá para que puedas calificar la venta."
            accion={
              <Link
                href="/listados"
                className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Explorar publicaciones
              </Link>
            }
          />
        </div>
      )}
    </main>
  );
}