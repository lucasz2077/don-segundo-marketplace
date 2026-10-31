import { BadgeCheck } from "lucide-react";
import { Insignia } from "@/components/ui/insignia";

type BadgeVerificadoProps = {
  /**
   * Estado de verificación del vendedor. Solo cuando es exactamente
   * "VERIFIED" se renderiza el sello (RF-34); en cualquier otro caso
   * (NONE/PENDING/REJECTED/undefined) el componente no pinta nada.
   */
  sellerVerified?: string | null;
};

/**
 * Sello de vendedor verificado (RF-34): insignia compacta de tono éxito que
 * solo se muestra cuando el vendedor está VERIFIED. Server-safe y sin estado;
 * el ícono es decorativo y el texto lleva el significado (contraste AA).
 */
export function BadgeVerificado({ sellerVerified }: BadgeVerificadoProps) {
  if (sellerVerified !== "VERIFIED") {
    return null;
  }

  return (
    <Insignia tono="exito" icono={BadgeCheck}>
      Verificado
    </Insignia>
  );
}
