/**
 * Etiquetas en español para los motivos de reporte. Viven en un módulo sin
 * dependencias de servidor para poder usarse tanto en componentes client
 * (formulario de reporte) como en el panel de moderación.
 */
export const etiquetasMotivoReporte = {
  SPAM: "Es spam",
  INAPPROPRIATE: "Contenido inapropiado",
  FRAUD: "Fraude o estafa",
  DUPLICATE: "Publicación duplicada",
  OTHER: "Otro",
} as const;

/** Etiquetas en español para cada estado de un reporte. */
export const etiquetasEstadoReporte = {
  OPEN: "Abierto",
  REVIEWED: "Revisado",
  RESOLVED: "Resuelto",
  DISMISSED: "Descartado",
} as const;