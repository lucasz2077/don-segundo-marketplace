import type { Metadata } from "next";
import { Alegreya, Geist } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { PieDePagina } from "@/components/layout/pie-pagina";
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

export const metadata: Metadata = {
  title: "Don Segundo — Marketplace del Campo",
  description:
    "El marketplace del campo argentino. Compra y venta de maquinaria, herramientas, insumos y hacienda.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
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
