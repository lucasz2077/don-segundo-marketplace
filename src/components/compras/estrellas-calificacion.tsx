type EstrellasCalificacionProps = {
  /** Promedio de la calificación (0-5) a mostrar. */
  promedio: number;
  /** Cantidad de reseñas que componen el promedio. */
  cantidad: number;
  /** Tamaño visual de las estrellas. */
  tamanio?: "sm" | "md" | "lg";
};

const formateadorPromedio = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 1,
});

const tamanios: Record<"sm" | "md" | "lg", string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const RUTA_ESTRELLA =
  "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

/**
 * Estrella de display con relleno parcial (0-100%): el ícono base queda
 * opaco y una capa superior recortada lo pinta de ámbar según la fracción.
 * Es puramente decorativa: aria-hidden (E4).
 */
function Estrella({
  fraccion,
  className,
}: {
  fraccion: number;
  className: string;
}) {
  return (
    <span className="relative inline-block" aria-hidden="true">
      <svg viewBox="0 0 24 24" className={`${className} fill-brand-200`}>
        <path d={RUTA_ESTRELLA} />
      </svg>
      {fraccion > 0 ? (
        <span
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${Math.min(fraccion, 1) * 100}%` }}
        >
          <svg viewBox="0 0 24 24" className={`${className} fill-accent-500`}>
            <path d={RUTA_ESTRELLA} />
          </svg>
        </span>
      ) : null}
    </span>
  );
}

/**
 * Estrellas de calificación en modo display (E4): role="img" con aria-label
 * en formato es-AR "4,5 de 5 (12 reseñas)" y el promedio visible en texto.
 * Los íconos son aria-hidden; la información completa viaja en el label.
 */
export function EstrellasCalificacion({
  promedio,
  cantidad,
  tamanio = "md",
}: EstrellasCalificacionProps) {
  const textoPromedio = formateadorPromedio.format(promedio);
  const palabraResenias = cantidad === 1 ? "reseña" : "reseñas";
  const etiqueta = `${textoPromedio} de 5 (${cantidad} ${palabraResenias})`;
  const claseTamanio = tamanios[tamanio];

  return (
    <div className="flex items-center gap-2">
      <div role="img" aria-label={etiqueta} className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((indice) => (
          <Estrella
            key={indice}
            fraccion={promedio - indice}
            className={claseTamanio}
          />
        ))}
      </div>
      <p className="text-sm">
        <span className="font-medium text-brand-900 dark:text-bone">
          {textoPromedio}
        </span>{" "}
        <span className="text-brand-600 dark:text-brand-200">
          ({cantidad} {palabraResenias})
        </span>
      </p>
    </div>
  );
}