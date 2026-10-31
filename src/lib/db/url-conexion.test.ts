import { describe, expect, it } from "vitest";
import { urlConexionSinSsl } from "@/lib/db/url-conexion";

const BASE =
  "postgresql://postgres.ref:p%40ss@aws-0-us-east-2.pooler.supabase.com:6543/postgres";

describe("urlConexionSinSsl", () => {
  it("quita sslmode y demás parámetros SSL que pisan la config del pool", () => {
    expect(urlConexionSinSsl(`${BASE}?sslmode=require`)).toBe(BASE);
    expect(urlConexionSinSsl(`${BASE}?sslmode=verify-full&sslrootcert=/x.crt`)).toBe(BASE);
  });

  it("conserva los demás parámetros y la contraseña codificada", () => {
    expect(urlConexionSinSsl(`${BASE}?sslmode=require&schema=public`)).toBe(
      `${BASE}?schema=public`
    );
  });

  it("deja igual una URL sin parámetros SSL, vacía o inválida", () => {
    expect(urlConexionSinSsl(BASE)).toBe(BASE);
    expect(urlConexionSinSsl(undefined)).toBeUndefined();
    expect(urlConexionSinSsl("no es una url")).toBe("no es una url");
  });
});
