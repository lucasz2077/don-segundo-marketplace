type BadgeVerificadoProps = {
  /**
   * Estado de verificación del vendedor. Solo cuando es exactamente
   * "VERIFIED" se renderiza el sello (RF-34); en cualquier otro caso
   * (NONE/PENDING/REJECTED/undefined) el componente no pinta nada.
   */
  sellerVerified?: string | null;
};

/**
 * Sello de vendedor verificado (RF-34): badge compacto que solo se muestra
 * cuando el vendedor está VERIFIED. Es un server-safe component sin estado;
 * el ícono de check es decorativo (aria-hidden) y el texto lleva el
 * significado. Verde del tema (`success`), con contraste AA sobre las
 * superficies claras del proyecto.
 */
export function BadgeVerificado({ sellerVerified }: BadgeVerificadoProps) {
  if (sellerVerified !== "VERIFIED") {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Verificado
    </span>
  );
}