type ErrorAuth = { code?: string; message?: string } | null | undefined;

/** Códigos de error de Better Auth traducidos al español argentino. */
const MENSAJES_POR_CODIGO: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "El email o la contraseña no son correctos.",
  USER_ALREADY_EXISTS: "Ya existe una cuenta con ese email. Probá ingresar.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese email. Probá ingresar.",
  PASSWORD_TOO_SHORT: "La contraseña es demasiado corta.",
  PASSWORD_TOO_LONG: "La contraseña es demasiado larga.",
  INVALID_EMAIL: "Ingresá un email válido.",
  TOO_MANY_REQUESTS: "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar.",
};

/**
 * Mensaje de error de autenticación para mostrar al usuario. Better Auth
 * responde en inglés: se traduce por código y, si el código es desconocido,
 * se usa el texto de respaldo en lugar del mensaje original.
 */
export function mensajeErrorAuth(error: ErrorAuth, respaldo: string): string {
  if (error?.code && MENSAJES_POR_CODIGO[error.code]) {
    return MENSAJES_POR_CODIGO[error.code];
  }
  return respaldo;
}
