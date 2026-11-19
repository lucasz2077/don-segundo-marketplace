import type { Metadata } from "next";
import { Alegreya, Geist } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { PieDePagina } from "@/components/layout/pie-pagina";
import { DESCRIPCION_SITIO, NOMBRE_SITIO, urlSitio } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Serif de marca para títulos destacados (token `font-marca`).
const alegreya = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin"],
});

// RNF-12: base de las URLs absolutas (vista previa al compartir), plantilla
// de títulos ("Tractor usado — Don Segundo") y Open Graph por defecto. La
// imagen por defecto sale de app/opengraph-image.tsx.
export const metadata: Metadata = {
  metadataBase: new URL(urlSitio()),
  title: {
    default: `${NOMBRE_SITIO} — El marketplace del campo argentino`,
    template: `%s — ${NOMBRE_SITIO}`,
  },
  description: DESCRIPCION_SITIO,
  applicationName: NOMBRE_SITIO,
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: NOMBRE_SITIO,
    title: `${NOMBRE_SITIO} — El marketplace del campo argentino`,
    description: DESCRIPCION_SITIO,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${alegreya.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-fondo font-sans text-tinta">
        <a
          href="#contenido"
          className="sr-only rounded-control bg-superficie px-4 py-2 text-sm font-semibold text-tinta shadow-modal focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
        >
          Saltar al contenido
        </a>
        <Navbar />
        <div id="contenido" className="flex flex-1 flex-col">
          {children}
        </div>
        <PieDePagina />
      </body>
    </html>
  );
}
