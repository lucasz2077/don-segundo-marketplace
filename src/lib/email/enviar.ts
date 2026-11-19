/**
 * Envío de mails transaccionales con Resend (decisión del dueño, D1). Es el
 * ÚNICO lugar que habla con el proveedor: los tests lo mockean y cambiar de
 * proveedor toca solo este archivo. Se usa la API HTTP con `fetch` (sin SDK).
 *
 * Variables (solo servidor, RNF-20): `RESEND_API_KEY` y `EMAIL_REMITENTE`
 * ("Don Segundo <avisos@dominio>"). Si faltan, no se envía nada y se avisa
 * una vez en el log: el sitio sigue funcionando sin mails.
 */

const URL_API_RESEND = "https://api.resend.com/emails";
const TIEMPO_MAXIMO_MS = 8000;

export type MensajeEmail = {
  para: string;
  asunto: string;
  html: string;
  texto: string;
  /** Evita mandar dos veces el mismo mail si se reintenta (Resend lo respeta 24 h). */
  claveIdempotencia?: string;
};

let avisoSinConfiguracion = false;

/** Indica si el envío de mails está configurado en este entorno. */
export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_REMITENTE?.trim());
}

/**
 * Envía un mail. Devuelve `true` si el proveedor lo aceptó y `false` si no
 * hay configuración o el envío falló. Nunca lanza: los mails son
 * complementarios y un fallo no debe romper la operación que los dispara.
 * No loguea el contenido ni la clave.
 */
export async function enviarEmail(mensaje: MensajeEmail): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY?.trim();
  const remitente = process.env.EMAIL_REMITENTE?.trim();
  if (!clave || !remitente) {
    if (!avisoSinConfiguracion) {
      console.warn("EMAIL_NO_CONFIGURADO: faltan RESEND_API_KEY o EMAIL_REMITENTE; no se envían mails.");
      avisoSinConfiguracion = true;
    }
    return false;
  }

  try {
    const respuesta = await fetch(URL_API_RESEND, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
        ...(mensaje.claveIdempotencia ? { "Idempotency-Key": mensaje.claveIdempotencia } : {}),
      },
      body: JSON.stringify({
        from: remitente,
        to: [mensaje.para],
        subject: mensaje.asunto,
        html: mensaje.html,
        text: mensaje.texto,
      }),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
    if (!respuesta.ok) {
      console.error("EMAIL_RECHAZADO", { status: respuesta.status, asunto: mensaje.asunto });
      return false;
    }
    return true;
  } catch (error) {
    console.error("EMAIL_FALLIDO", {
      asunto: mensaje.asunto,
      error: error instanceof Error ? error.name : "desconocido",
    });
    return false;
  }
}
