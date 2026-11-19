import { waitUntil } from "@vercel/functions";

import { enviarEmail } from "@/lib/email/enviar";
import { plantillaRestablecerContrasenia, plantillaVerificacion } from "@/lib/email/plantillas";

type DatosEmailAuth = {
  user: { email: string; name?: string | null };
  url: string;
};

/**
 * Better Auth espera a que estas funciones terminen antes de responder. Se
 * despacha el envío con `waitUntil` (Vercel mantiene viva la función hasta
 * que termina) para no demorar la respuesta ni revelar, por el tiempo de
 * respuesta, si un email existe al pedir la recuperación de contraseña.
 */
function despachar(envio: Promise<boolean>) {
  waitUntil(envio);
}

/** Mail de confirmación de cuenta (RF-01, CA-01). */
export async function enviarEmailVerificacion({ user, url }: DatosEmailAuth) {
  const contenido = plantillaVerificacion(user.name, url);
  despachar(enviarEmail({ para: user.email, ...contenido }));
}

/** Mail de recuperación de contraseña (RF-03). */
export async function enviarEmailRestablecer({ user, url }: DatosEmailAuth) {
  const contenido = plantillaRestablecerContrasenia(user.name, url);
  despachar(enviarEmail({ para: user.email, ...contenido }));
}
