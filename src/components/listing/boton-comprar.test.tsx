import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/listados/l1",
}));

import { BotonComprar } from "./boton-comprar";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BotonComprar", () => {
  it("muestra el aviso del servidor al llegar al tope de compras sin pagar (D9)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "COMPRAS_PENDIENTES", message: "Tenés 5 compras sin pagar." },
          }),
          { status: 429 }
        )
      )
    );
    const usuario = userEvent.setup();
    render(<BotonComprar listingId="l1" sesionIniciada />);

    await usuario.click(screen.getByRole("button", { name: "Comprar ahora" }));

    expect(await screen.findByText("Tenés 5 compras sin pagar.")).toBeInTheDocument();
  });

  it("sin sesión ofrece ingresar y volver a la publicación", () => {
    render(<BotonComprar listingId="l1" sesionIniciada={false} />);

    expect(screen.getByRole("link", { name: "Comprar ahora" })).toHaveAttribute(
      "href",
      "/sign-in?redirect=%2Flistados%2Fl1"
    );
  });
});
