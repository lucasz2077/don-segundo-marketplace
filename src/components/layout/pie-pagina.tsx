import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, RotateCcw, ShieldCheck, type LucideIcon } from "lucide-react";
import { Contenedor } from "@/components/ui/contenedor";
import { obtenerCategoriasNavegacion } from "./categorias-navegacion";
import { ENLACES_COMPRAR, ENLACES_CUENTA, ENLACES_VENDER } from "./enlaces-navegacion";

type Garantia = {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
};

/**
 * Señales de confianza respaldadas por funcionalidades reales: cobro con
 * Mercado Pago (RF-39), sello de vendedor verificado (RF-34) y devoluciones
 * dentro de los 7 días de aprobado el pago (RF-49).
 */
const GARANTIAS: Garantia[] = [
  {
    icono: ShieldCheck,
    titulo: "Pagás con Mercado Pago",
    descripcion: "Tu pago se procesa de forma segura en Mercado Pago.",
  },
  {
    icono: BadgeCheck,
    titulo: "Vendedores verificados",
    descripcion: "Buscá el sello: identidad y domicilio validados por Don Segundo.",
  },
  {
    icono: RotateCcw,
    titulo: "7 días para devolver",
    descripcion: "Si algo no está bien, solicitá la devolución desde Mis compras.",
  },
];

function ColumnaEnlaces({
  titulo,
  enlaces,
}: {
  titulo: string;
  enlaces: Array<{ href: string; etiqueta: string }>;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-white">{titulo}</h2>
      <ul className="mt-2">
        {enlaces.map(({ href, etiqueta }) => (
          <li key={href}>
            <Link
              href={href}
              className="inline-flex min-h-9 items-center text-sm text-brand-200 hover:text-white hover:underline"
            >
              {etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Footer global: franja de garantías sobre superficie clara y, debajo, el
 * bloque de marca con accesos de compra, venta, cuenta y categorías.
 */
export async function PieDePagina() {
  const categorias = await obtenerCategoriasNavegacion();
  const anio = new Date().getFullYear();

  return (
    <footer className="mt-12">
      <section aria-label="Por qué comprar en Don Segundo" className="border-y border-linea bg-superficie">
        <Contenedor className="grid grid-cols-1 gap-6 py-8 sm:grid-cols-3">
          {GARANTIAS.map(({ icono: Icono, titulo, descripcion }) => (
            <div key={titulo} className="flex gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Icono className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-tinta">{titulo}</h2>
                <p className="mt-1 text-sm text-tinta-tenue">{descripcion}</p>
              </div>
            </div>
          ))}
        </Contenedor>
      </section>

      <div className="bg-brand-900">
        <Contenedor className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="inline-block">
              <Image
                src="/marca/logo-crema.svg"
                alt="Don Segundo, desde 1936"
                width={120}
                height={120}
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm text-brand-200">
              El marketplace del campo argentino: maquinaria, insumos, hacienda y servicios
              rurales, de productor a productor.
            </p>
          </div>
          <ColumnaEnlaces titulo="Comprar" enlaces={ENLACES_COMPRAR} />
          <ColumnaEnlaces titulo="Vender" enlaces={ENLACES_VENDER} />
          <ColumnaEnlaces titulo="Mi cuenta" enlaces={ENLACES_CUENTA} />
          {categorias.length > 0 ? (
            <ColumnaEnlaces
              titulo="Categorías"
              enlaces={categorias.map((categoria) => ({
                href: `/categorias/${categoria.slug}`,
                etiqueta: categoria.name,
              }))}
            />
          ) : null}
        </Contenedor>
        <div className="border-t border-white/10">
          <Contenedor className="py-5">
            <p className="text-xs text-brand-300">
              © {anio} Don Segundo. Todos los derechos reservados.
            </p>
          </Contenedor>
        </div>
      </div>
    </footer>
  );
}
