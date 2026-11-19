import { redirect } from "next/navigation";

/**
 * Ruta heredada del MVP: el panel del usuario ahora es "Mi cuenta"
 * (/perfil). Se conserva la URL para no romper enlaces viejos.
 */
export default function DashboardPage() {
  redirect("/perfil");
}
