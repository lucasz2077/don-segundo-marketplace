import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ExternalLink, Tag } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { obtenerEstadoVinculacionMp } from "@/lib/pagos/oauth";
import { PaginaCuenta } from "@/components/cuenta/pagina-cuenta";
import { GRUPOS_CUENTA } from "@/components/cuenta/secciones-cuenta";
import { Alerta } from "@/components/ui/alerta";
import { Avatar } from "@/components/ui/avatar";
import { clasesBoton } from "@/components/ui/boton";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { Tarjeta } from "@/components/ui/tarjeta";

export const dynamic = "force-dynamic";

/**
 * Índice y resumen de "Mi cuenta". En mobile es el menú de la cuenta (cada
 * sección como fila tocable); en desktop acompaña a la navegación lateral.
 * Muestra el estado del vínculo con Mercado Pago (RF-47/RF-48), requisito
 * para vender, resuelto server-side: nunca llegan tokens al cliente (RNF-20).
 */
export default async function PerfilPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in?redirect=/perfil");
  }

  const estadoMp = await obtenerEstadoVinculacionMp(session.user.id);
  const primerNombre = session.user.name.trim().split(/\s+/)[0] || session.user.name;

  // `<a>` nativo, no `<Link>`: la ruta responde 302 hacia
  // auth.mercadopago.com.ar y el prefetch RSC de `<Link>` seguía la
  // redirección con fetch, que MP bloquea por CORS. Navegación completa.
  const enlaceMp = (
    <a
      href="/api/pagos/oauth/iniciar"
      className={clasesBoton({ variante: estadoMp === "VINCULADA" ? "secundario" : "primario", tamanio: "sm" })}
    >
      {estadoMp === "SIN_VINCULO" ? "Vincular Mercado Pago" : "Re-vincular"}
      <ExternalLink className="size-4" aria-hidden="true" />
    </a>
  );

  return (
    <PaginaCuenta titulo="Mi cuenta" sinRegreso>
      <div className="flex flex-col gap-4">
        <Tarjeta relleno="ninguno" className="p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <Avatar nombre={session.user.name} imagen={session.user.image} tamanio="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-tinta">Hola, {primerNombre}</p>
              <p className="truncate text-sm text-tinta-tenue">{session.user.email}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
            <BotonEnlace href="/publicar" variante="acento" tamanio="sm">
              <Tag className="size-4" aria-hidden="true" />
              Publicar
            </BotonEnlace>
            <BotonEnlace href={`/vendedores/${session.user.id}`} variante="secundario" tamanio="sm">
              Ver mi perfil público
            </BotonEnlace>
          </div>
        </Tarjeta>

        {estadoMp === "VINCULADA" ? (
          <Alerta tono="exito" titulo="Mercado Pago vinculado" accion={enlaceMp}>
            Tu cuenta está lista para cobrar tus ventas.
          </Alerta>
        ) : estadoMp === "REVOCADA" ? (
          <Alerta tono="advertencia" titulo="Tu vínculo con Mercado Pago fue revocado" accion={enlaceMp}>
            Volvé a vincularlo para seguir publicando y cobrando tus ventas.
          </Alerta>
        ) : (
          <Alerta titulo="Vinculá tu cuenta de Mercado Pago para vender" accion={enlaceMp}>
            Es el requisito para publicar: tus ventas se cobran directo en tu cuenta.
          </Alerta>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {GRUPOS_CUENTA.map((grupo) => (
            <Tarjeta key={grupo.titulo} as="section" relleno="ninguno" className="overflow-hidden">
              <h2 className="border-b border-linea px-4 py-3 text-sm font-semibold text-tinta sm:px-5">
                {grupo.titulo}
              </h2>
              <ul className="divide-y divide-linea">
                {grupo.enlaces.map(({ href, etiqueta, descripcion, icono: Icono }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none sm:px-5"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                        <Icono className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-tinta">{etiqueta}</span>
                        <span className="block text-xs text-tinta-tenue">{descripcion}</span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-tinta-tenue" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          ))}
        </div>
      </div>
    </PaginaCuenta>
  );
}
