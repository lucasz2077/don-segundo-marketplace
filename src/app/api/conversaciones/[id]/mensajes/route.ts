import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { enviarMensajeSchema } from "@/lib/validation/mensaje";
import {
  enviarMensaje,
  obtenerMensajesNuevos,
  NoParticipanteError,
  PublicacionNoDisponibleError,
} from "@/lib/conversaciones";

export const dynamic = "force-dynamic";

const MAXIMO_ENVIOS_POR_MINUTO = 20;
const VENTANA_RATE_LIMIT_MS = 60_000;
const ocurrenciasDeEnvio = new Map<string, number[]>();

/**
 * Rate limit en memoria para el envío de mensajes (RNF-07): permite como
 * máximo 20 envíos por minutos por usuario y conversación. En serverless con
 * múltiples instancias es best-effort por instancia; no reemplaza un límite
 * global si el abuso escala.
 */
function excedeRateLimit(userId: string, conversacionId: string): boolean {
  const ahora = Date.now();
  const limiteInferior = ahora - VENTANA_RATE_LIMIT_MS;
  const clave = `${userId}:${conversacionId}`;
  const ocurrencias = (ocurrenciasDeEnvio.get(clave) ?? []).filter(
    (marca) => marca > limiteInferior
  );

  if (ocurrencias.length >= MAXIMO_ENVIOS_POR_MINUTO) {
    ocurrenciasDeEnvio.set(clave, ocurrencias);
    return true;
  }

  // Limpieza: si la ventana expiró por completo, se descarta la clave.
  if (ocurrencias.length === 0) {
    ocurrenciasDeEnvio.delete(clave);
  }

  ocurrencias.push(ahora);
  ocurrenciasDeEnvio.set(clave, ocurrencias);

  return false;
}

type ErrorRespuesta = {
  error: { code: string; message: string };
};

function respuestaError(
  status: number,
  code: string,
  message: string
): NextResponse<ErrorRespuesta> {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * GET /api/conversaciones/[id]/mensajes?after=ISO — polling incremental del
 * chat: devuelve solo los mensajes con createdAt posterior al cursor, junto
 * con los ids de los mensajes propios ya leídos por la otra parte. 400 si el
 * cursor falta o no es una fecha ISO 8601 válida; 404 si el usuario no
 * participa de la conversación.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  const after = request.nextUrl.searchParams.get("after");
  if (!after) {
    return respuestaError(400, "CURSOR_INVALIDO", "El parámetro after es obligatorio");
  }
  const despuesDe = new Date(after);
  if (Number.isNaN(despuesDe.getTime())) {
    return respuestaError(
      400,
      "CURSOR_INVALIDO",
      "El parámetro after debe ser una fecha ISO 8601 válida"
    );
  }

  try {
    const resultado = await obtenerMensajesNuevos(id, session.user.id, despuesDe);
    return NextResponse.json({ data: resultado });
  } catch (error) {
    if (error instanceof NoParticipanteError) {
      return respuestaError(404, "NO_ENCONTRADA", error.message);
    }
    console.error("Error al consultar mensajes nuevos:", error);
    return respuestaError(
      500,
      "ERROR_INTERNO",
      "No se pudieron obtener los mensajes. Intenta de nuevo."
    );
  }
}

/**
 * POST /api/conversaciones/[id]/mensajes — envía un mensaje en una
 * conversación existente. El usuario debe participar de la conversación y la
 * publicación debe seguir activa. El envío está limitado por la regla
 * RNF-07 (máximo 20 mensajes por minuto por usuario y conversación).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  if (excedeRateLimit(session.user.id, id)) {
    return respuestaError(
      429,
      "RATE_LIMIT",
      "Estás enviando mensajes muy rápido. Intenta de nuevo en un momento."
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return respuestaError(400, "CUERPO_INVALIDO", "El cuerpo de la petición no es JSON válido");
  }

  const parseado = enviarMensajeSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "El mensaje no es válido"
    );
  }

  try {
    const mensaje = await enviarMensaje(id, session.user.id, parseado.data.mensaje);
    return NextResponse.json({ data: mensaje }, { status: 201 });
  } catch (error) {
    if (error instanceof NoParticipanteError) {
      return respuestaError(404, "NO_ENCONTRADA", error.message);
    }
    if (error instanceof PublicacionNoDisponibleError) {
      return respuestaError(400, "NO_ENCONTRADA", error.message);
    }
    console.error("Error al enviar mensaje:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo enviar el mensaje. Intenta de nuevo.");
  }
}