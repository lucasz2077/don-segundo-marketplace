import type { Metadata } from "next";
import { Alegreya, Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      className={`${geistSans.variable} ${geistMono.variable} ${alegreya.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-fondo font-sans text-tinta">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
