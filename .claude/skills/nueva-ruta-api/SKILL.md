---
name: nueva-ruta-api
description: Crea un endpoint REST nuevo en src/app/api siguiendo el patrón de la casa (getSession, parseo JSON, schema Zod, servicio en src/lib, errores de dominio mapeados a HTTP, contrato { data } / { error: { code, message } }) junto con su schema, su servicio y su test. Usala cuando haya que agregar o rehacer una ruta API. Argumentos opcionales: método, ruta y qué hace, p. ej. "POST /api/listings/[id]/preguntas crea una pregunta pública (RF-60)".
argument-hint: "<MÉTODO> /api/<ruta> <qué hace> [RF-xx]"
---

# Nueva ruta API — Don Segundo

Pedido: $ARGUMENTS

Si falta el método, la ruta, quién puede llamarla o el requisito (`RF-xx`), preguntalo antes de escribir código. Si el requisito no existe en `docs/requirements.md`, proponé el texto y agregalo (los documentos son "vivos": no se implementa nada que no esté documentado).

## 1. Antes de escribir

- Buscá una ruta parecida y copiá su estilo, no el de esta guía si difieren: `src/app/api/reportes/route.ts` (POST con sesión), `src/app/api/reportes/[id]/route.ts` (admin + `params`), `src/app/api/perfil/route.ts`.
- Ubicá el servicio del dominio en `src/lib/<dominio>.ts` (un archivo por dominio; **no** `src/lib/services/`) y el schema en `src/lib/validation/<dominio>.ts`. Si ya existen, extendelos.
- Si la ruta toca pagos (`src/lib/pagos/`, `compras.ts`, devoluciones), al terminar pedile una revisión al subagente `revisor-pagos`.
- Next 16: `params` es una `Promise` y se hace `await`. Ante una duda de API, consultá `node_modules/next/dist/docs/`.

## 2. Capas (de adentro hacia afuera)

1. **Schema Zod** (`src/lib/validation/<dominio>.ts`): Zod 4 (`z.uuid()`, `z.enum([...], { message })`, `.trim()`), mensajes en español, exportá también el tipo con `z.infer`.
2. **Servicio** (`src/lib/<dominio>.ts`): toda la regla de negocio y el acceso a Prisma (`import { prisma } from "@/lib/db/prisma"`).
   - Errores de dominio como clases exportadas (`export class XError extends Error { constructor() { super("Mensaje en español"); this.name = "XError"; } }`).
   - Cambios de estado con `updateMany` condicionado al estado de origen dentro de `prisma.$transaction`; `count === 0` es carrera o ya procesado (no-op idempotente).
   - Montos con `Prisma.Decimal` y `toFixed(2)`, nunca floats.
   - Notificaciones (`crearNotificacion`) después de la transacción, en `try/catch`: nunca revierten la operación.
   - Admin: re-chequeá el rol en base dentro del servicio (`esAdministrador` de `src/lib/reportes.ts`), además del chequeo del claim en la ruta.
   - Soft delete de publicaciones: `status: "DELETED"` + `deletedAt`; filtrá `deletedAt: null`.
3. **Ruta** (`src/app/api/<ruta>/route.ts`): delgada. No escribe Prisma ni reglas de negocio.

## 3. Plantilla de la ruta

```ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { crearCosaSchema } from "@/lib/validation/cosas";
import { CosaNoEncontradaError, crearCosa } from "@/lib/cosas";

export const dynamic = "force-dynamic";

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
 * POST /api/cosas/[id] — <qué hace> (RF-xx).
 * Requiere sesión. 400 VALIDACION, 404 NO_ENCONTRADA, ...
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
  // Solo admin: if (session.user.role !== "ADMIN") return respuestaError(403, "SIN_PERMISO", "...");

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return respuestaError(400, "CUERPO_INVALIDO", "El cuerpo de la petición no es JSON válido");
  }

  const parseado = crearCosaSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "Los datos no son válidos"
    );
  }

  try {
    const cosa = await crearCosa(session.user.id, id, parseado.data);
    return NextResponse.json({ data: cosa }, { status: 201 });
  } catch (error) {
    if (error instanceof CosaNoEncontradaError) {
      return respuestaError(404, "NO_ENCONTRADA", error.message);
    }
    console.error("Error al crear cosa:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo completar la operación. Intentá de nuevo.");
  }
}
```

- Sin cuerpo (GET/DELETE): salteá el parseo; validá `params` o `searchParams` con Zod si hace falta (p. ej. `z.uuid().safeParse(id)` → 400 `VALIDACION`).
- Códigos de error en MAYÚSCULAS y en español: `NO_AUTENTICADO` (401), `SIN_PERMISO` (403), `CUERPO_INVALIDO` / `VALIDACION` (400), `NO_ENCONTRADA` (404), `ERROR_INTERNO` (500). Para casos propios del dominio, un código descriptivo (`SIN_STOCK`, `PAGO_INDISPONIBLE`).
- Nunca devuelvas el `error` crudo, tokens ni datos de otro usuario en la respuesta.
- Ruta pública nueva (sin sesión): justificalo en el comentario y revisá `src/proxy.ts` (hoy solo protege `/dashboard`).

## 4. Test de la ruta (`route.test.ts` al lado)

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  crearCosa: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSession: mocks.getSession }));

// Se conservan las clases de error reales (la ruta usa instanceof).
vi.mock("@/lib/cosas", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cosas")>();
  return { ...actual, crearCosa: mocks.crearCosa };
});

// Evita instanciar el adaptador PrismaPg al importar el módulo real.
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import { POST } from "@/app/api/cosas/[id]/route";
import { CosaNoEncontradaError } from "@/lib/cosas";

const ID = "550e8400-e29b-41d4-a716-446655440000";
const contexto = { params: Promise.resolve({ id: ID }) };

function postRequest(contenido: unknown): NextRequest {
  return new Request(`http://localhost/api/cosas/${ID}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(contenido),
  }) as NextRequest;
}

describe("POST /api/cosas/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("responde 401 NO_AUTENTICADO sin sesión y no llama al servicio", async () => {
    mocks.getSession.mockResolvedValue(null);
    const respuesta = await POST(postRequest({}), contexto);
    expect(respuesta.status).toBe(401);
    expect((await respuesta.json()).error.code).toBe("NO_AUTENTICADO");
    expect(mocks.crearCosa).not.toHaveBeenCalled();
  });
  // + CUERPO_INVALIDO, VALIDACION, cada error de dominio → su status/código,
  //   ERROR_INTERNO ante un error inesperado, y el caso feliz con { data }.
});
```

Cubrí como mínimo: sin sesión, sin permiso (si aplica), JSON inválido, validación, cada error de dominio, error inesperado (500 sin filtrar detalles) y el caso feliz con `session.user.id`. Si el servicio es nuevo, agregá `src/lib/<dominio>.test.ts` con `vi.mock("@/lib/db/prisma", ...)` y casos de carrera (`count === 0`). Nunca llames a Mercado Pago real: mockeá `src/lib/pagos/*`. Citá el `RF-xx` en el nombre de los `it(...)`.

## 5. Cierre

1. `npx prisma generate` si tocaste el schema; `npm run lint`; `npx vitest run <archivos nuevos>`.
2. Cliente: si un componente llama a la ruta, que sea un Client Component acotado con `fetch` que lea `{ data }` / `{ error }`.
3. Documentación: corré `/actualizar-docs`, o actualizá vos `docs/requirements.md` (RF), `docs/architecture.md` (flujos) y `docs/database.md` (modelos) si cambiaron.
4. Commit en español con conventional commits y el requisito: `feat(<dominio>): agrega <qué> (RF-xx)`.
