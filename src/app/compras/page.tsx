import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  compraEnVentanaCalificacion,
  compraEnVentanaDevolucion,
  obtenerMisCompras,
} from "@/lib/compras";
import { ShoppingBag } from "lucide-react";
import { TarjetaCompra } from "@/components/compras/tarjeta-compra";
import { PaginaCuenta } from "@/components/cuenta/pagina-cuenta";
import { BotonEnlace } from "@/components/ui/boton-enlace";
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
    <PaginaCuenta
      titulo="Mis compras"
      descripcion="Seguí el pago de cada compra, calificá al vendedor o pedí una devolución."
    >
      {compras.length > 0 ? (
        <ul className="flex flex-col gap-3 sm:gap-4">
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
        <EstadoVacio
          icono={ShoppingBag}
          titulo="Todavía no compraste nada"
          descripcion="Cuando compres una publicación, aparece acá para que sigas el pago y califiques la venta."
          accion={<BotonEnlace href="/listados">Explorar publicaciones</BotonEnlace>}
        />
      )}
    </PaginaCuenta>
  );
}
