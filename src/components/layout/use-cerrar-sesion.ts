"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

/** Cierra la sesión con Better Auth y vuelve al inicio refrescando el RSC. */
export function useCerrarSesion() {
  const router = useRouter();
  const [cerrando, setCerrando] = useState(false);

  async function cerrarSesion() {
    setCerrando(true);
    try {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setCerrando(false);
    }
  }

  return { cerrando, cerrarSesion };
}
