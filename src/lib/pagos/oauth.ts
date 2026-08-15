import { createHash } from "node:crypto";
import { OAuth } from "mercadopago";
import type { VendedorMpAccount } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { clienteMpApp } from "@/lib/pagos/mp";
import { crearNotificacion } from "@/lib/notificaciones";

/** Credenciales de la app de MP desde el entorno (server-side, RNF-20). */
function credencialesMp(): { client_id: string; client_secret: string } {
  const client_id = process.env.MP_CLIENT_ID;
  const client_secret = process.env.MP_CLIENT_SECRET;
  if (!client_id || !client_secret) {
    throw new Error("Faltan MP_CLIENT_ID / MP_CLIENT_SECRET");
  }
  return { client_id, client_secret };
}

/** URL de callback registrada en la app MP (RF-47). */
function urlCallback(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/pagos/oauth/callback`;
}

/**
 * State de CSRF para OAuth (RF-48/§5): hash determinístico del userId (la
 * sesión ya autenticó al usuario); el callback re-verifica contra la sesión
 * activa antes de completar la vinculación.
 */
export function stateOAuth(userId: string): string {
  return createHash("sha256").update(userId).digest("hex");
}

/**
 * Vincula la cuenta de un vendedor con Mercado Pago intercambiando el `code`
 * del authorization-code grant (RF-47). Los tokens se guardan SOLO en DB
 * server-side (nunca cliente/logs — RNF-20) y se persisten con upsert (la
 * re-vinculación revierte `revocadaAt`). `mpUserId` se guarda como String para
 * evitar problemas de precisión numérica con el user_id de MP.
 */
export async function completarVinculacionMp({
  userId,
  code,
}: {
  userId: string;
  code: string;
}): Promise<{ mpUserId: string }> {
  const { client_id, client_secret } = credencialesMp();
  const oauth = new OAuth(clienteMpApp());

  const respuesta = await oauth.create({
    body: {
      client_secret,
      client_id,
      code,
      redirect_uri: urlCallback(),
    },
  });

  if (!respuesta.access_token || !respuesta.user_id) {
    throw new Error("MP no devolvió tokens en la vinculación");
  }

  const mpUserId = String(respuesta.user_id);
  const accessTokenExpiresAt = respuesta.expires_in
    ? new Date(Date.now() + respuesta.expires_in * 1000)
    : null;

  await prisma.vendedorMpAccount.upsert({
    where: { userId },
    create: {
      userId,
      mpUserId,
      accessToken: respuesta.access_token,
      refreshToken: respuesta.refresh_token ?? null,
      accessTokenExpiresAt,
      liveMode: Boolean(respuesta.live_mode),
    },
    update: {
      mpUserId,
      accessToken: respuesta.access_token,
      refreshToken: respuesta.refresh_token ?? null,
      accessTokenExpiresAt,
      liveMode: Boolean(respuesta.live_mode),
      revocadaAt: null, // re-vinculación: revierte la revocación anterior
    },
  });

  return { mpUserId };
}

/**
 * Cuenta de MP vigente de un vendedor (no revocada). RF-47: las publicaciones
 * solo se crean/editan si existe; es la que se usa como collector del pago.
 */
export async function obtenerCuentaMpVigente(
  userId: string
): Promise<VendedorMpAccount | null> {
  return prisma.vendedorMpAccount.findFirst({
    where: { userId, revocadaAt: null },
  });
}

/** Error domínio de renovación de token (RF-48). */
export class RenovacionTokenError extends Error {
  constructor(causa?: unknown) {
    super("No se pudo renovar el token del vendedor", { cause: causa });
    this.name = "RenovacionTokenError";
  }
}

/**
 * Renueva el access token de un vendedor vía OAuth.refresh (RFC 48): si MP
 * lo rechaza (token denegado/vencido sin refresh posible), la cuenta se
 * REVOCA (revocadaAt), los tokens se anulan y se notifica al vendedor que
 * debe re-vincular. Devuelve el access token renovado para reintentar la
 * operación original UNA vez.
 */
export async function renovarTokenVendedor(
  vendedorMp: VendedorMpAccount
): Promise<{ accessToken: string }> {
  if (vendedorMp.revocadaAt) {
    throw new RenovacionTokenError(new Error("La cuenta ya está revocada"));
  }
  if (!vendedorMp.refreshToken) {
    await revocarCuenta(vendedorMp);
    throw new RenovacionTokenError(new Error("La cuenta no tiene refreshToken"));
  }

  const { client_id, client_secret } = credencialesMp();
  const oauth = new OAuth(clienteMpApp());

  try {
    const respuesta = await oauth.refresh({
      body: {
        client_secret,
        client_id,
        refresh_token: vendedorMp.refreshToken,
      },
    });

    if (!respuesta.access_token) {
      throw new Error("MP no devolvió access_token en el refresh");
    }

    const accessTokenExpiresAt = respuesta.expires_in
      ? new Date(Date.now() + respuesta.expires_in * 1000)
      : null;

    await prisma.vendedorMpAccount.update({
      where: { id: vendedorMp.id },
      data: {
        accessToken: respuesta.access_token,
        refreshToken: respuesta.refresh_token ?? null,
        accessTokenExpiresAt,
      },
    });

    return { accessToken: respuesta.access_token };
  } catch (error) {
    if (error instanceof RenovacionTokenError) throw error;
    await revocarCuenta(vendedorMp, error);
    throw new RenovacionTokenError(error);
  }
}

/** Anula tokens y revoca la cuenta + notifica al vendedor (RF-48). */
async function revocarCuenta(vendedorMp: VendedorMpAccount, causa?: unknown) {
  await prisma.vendedorMpAccount.update({
    where: { id: vendedorMp.id },
    data: {
      // Los tokens se anulan (RNF-20): nunca quedan tokens muertos guardados.
      accessToken: "",
      refreshToken: null,
      revocadaAt: new Date(),
    },
  });

  await crearNotificacion(
    vendedorMp.userId,
    null,
    "Vínculo con Mercado Pago expirado",
    "Tu vínculo con Mercado Pago expiró; re-vincularlo desde tu perfil para seguir vendiendo.",
    "GENERAL",
    { evento: "vinculacion_mp", estado: "REVOCADA" }
  );
  void causa;
}