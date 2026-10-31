import type { ReactNode } from "react";
import Image from "next/image";
import { BadgeCheck, RotateCcw, ShieldCheck } from "lucide-react";
import { Tarjeta } from "@/components/ui/tarjeta";

const BENEFICIOS = [
  { icono: ShieldCheck, texto: "Pagás y cobrás con Mercado Pago" },
  { icono: BadgeCheck, texto: "Vendedores verificados por Don Segundo" },
  { icono: RotateCcw, texto: "7 días para solicitar una devolución" },
] as const;

type PanelAutenticacionProps = {
  titulo: string;
  descripcion: string;
  /** Pie del formulario (p. ej. enlace a registrarse o ingresar). */
  pie: ReactNode;
  children: ReactNode;
};

/**
 * Marco de ingreso y registro. En mobile muestra solo el formulario (el
 * header ya lleva la marca); desde lg suma un panel de marca con la
 * propuesta y los beneficios reales.
 */
export function PanelAutenticacion({ titulo, descripcion, pie, children }: PanelAutenticacionProps) {
  return (
    <main className="flex flex-1 flex-col lg:flex-row">
      <section
        aria-label="Don Segundo"
        className="relative hidden overflow-hidden bg-brand-800 px-12 py-16 text-white lg:flex lg:w-5/12 lg:flex-col lg:justify-center"
      >
        <Image
          src="/marca/isotipo-crema.svg"
          alt=""
          width={320}
          height={309}
          className="pointer-events-none absolute -bottom-10 -right-10 hidden opacity-10 lg:block"
        />
        <div className="relative mx-auto w-full max-w-md">
          <p className="font-marca text-4xl font-medium leading-tight">
            El marketplace del campo argentino
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {BENEFICIOS.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-sm text-brand-100">
                <span className="flex size-9 items-center justify-center rounded-full bg-white/10">
                  <Icono className="size-5 text-accent-300" aria-hidden="true" />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="flex flex-1 items-start justify-center px-4 py-6 sm:py-10 lg:items-center">
        <Tarjeta relleno="ninguno" className="w-full max-w-md p-5 sm:p-8">
          <h1 className="text-2xl font-semibold text-tinta">{titulo}</h1>
          <p className="mt-1 text-sm text-tinta-tenue">{descripcion}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-6 border-t border-linea pt-5 text-center text-sm text-tinta-suave">
            {pie}
          </div>
        </Tarjeta>
      </div>
    </main>
  );
}
