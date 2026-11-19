import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

import PublicacionNoEncontrada from "@/app/listados/[id]/not-found";
import VendedorNoEncontrado from "@/app/vendedores/[id]/not-found";
import NoEncontrada from "@/app/not-found";

describe("Pantallas 404 por zona", () => {
  it("la publicación no disponible ofrece seguir buscando y favoritos", () => {
    render(<PublicacionNoEncontrada />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Esta publicación ya no está disponible" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver publicaciones parecidas" })).toHaveAttribute(
      "href",
      "/listados"
    );
    expect(screen.getByRole("link", { name: "Ir a mis favoritos" })).toHaveAttribute(
      "href",
      "/favoritos"
    );
  });

  it("el vendedor inexistente lo explica", () => {
    render(<VendedorNoEncontrado />);

    expect(
      screen.getByRole("heading", { level: 1, name: "No encontramos este vendedor" })
    ).toBeInTheDocument();
  });

  it("la 404 global mantiene sus acciones", () => {
    render(<NoEncontrada />);

    expect(screen.getByRole("heading", { level: 1, name: "No encontramos esta página" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  });
});
