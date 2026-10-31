import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { expirarOrdenesVencidas, reintentarReembolsosPendientes } from "@/lib/compras";
import { renovarTokensPorVencer } from "@/lib/pagos/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** True si el header Authorization trae `Bearer <CRON_SECRET>` (timing-safe). */
function autorizado(request: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(request.headers.get("authorization") ?? "");
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

/**
 * GET /api/cron/pagos — mantenimiento diario de pagos (Vercel Cron, ver
 * vercel.json). Vercel envía `Authorization: Bearer $CRON_SECRET`; sin
 * CRON_SECRET configurado la ruta rechaza todo (401). Tareas, cada una
 * aislada para que un fallo no corte las demás:
 * - renueva los tokens de vendedor que vencen pronto (RF-48);
 * - reintenta los reembolsos pendientes (D4, REEMBOLSO_PENDIENTE);
 * - expira las órdenes PENDIENTES vencidas (D5).
 */
export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json(
      { error: { code: "NO_AUTORIZADO", message: "No autorizado" } },
      { status: 401 }
    );
  }

  const resultado: Record<string, unknown> = {};
  const tareas = {
    tokens: () => renovarTokensPorVencer(),
    reembolsos: () => reintentarReembolsosPendientes(),
    ordenesExpiradas: () => expirarOrdenesVencidas(),
  };

  for (const [nombre, tarea] of Object.entries(tareas)) {
    try {
      resultado[nombre] = await tarea();
    } catch (error) {
      console.error("CRON_PAGOS_TAREA_FALLIDA", nombre, error);
      resultado[nombre] = { error: true };
    }
  }

  return NextResponse.json({ data: resultado });
}
