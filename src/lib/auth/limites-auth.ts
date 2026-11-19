/**
 * Rate limit de Better Auth (RNF-07). Se guarda en la base (tabla RateLimit)
 * para que valga en todas las instancias serverless de Vercel; en memoria
 * cada instancia tendría su propio contador. Better Auth lo activa solo en
 * producción. La clave es IP + ruta.
 *
 * Reglas (por IP):
 * - Ingreso: 5 intentos por minuto.
 * - Registro: 5 cuentas por hora.
 * - Recuperación de contraseña y reenvío de verificación: 3 por hora.
 * - Restablecer y cambiar contraseña: 5 cada 10 minutos.
 * - Consulta de sesión: sin límite (se pide en cada navegación y escribir un
 *   contador en cada una cargaría la base sin aportar seguridad).
 * - Resto de las rutas de auth: 100 por minuto.
 */
export const configuracionRateLimit = {
  storage: "database" as const,
  window: 60,
  max: 100,
  customRules: {
    "/sign-in/email": { window: 60, max: 5 },
    "/sign-up/email": { window: 60 * 60, max: 5 },
    "/request-password-reset": { window: 60 * 60, max: 3 },
    "/send-verification-email": { window: 60 * 60, max: 3 },
    "/reset-password": { window: 10 * 60, max: 5 },
    "/change-password": { window: 10 * 60, max: 5 },
    "/get-session": false as const,
  },
};

/**
 * Vercel completa `x-real-ip` y `x-forwarded-for` con la IP real del cliente
 * (reemplaza lo que mande el navegador), así que se puede confiar en ellos.
 */
export const encabezadosIp = ["x-real-ip", "x-forwarded-for"];
