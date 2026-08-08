import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { obtenerCategoriasRaiz } from "@/lib/categories";
import { PublicarFormulario } from "@/components/listing/publicar-formulario";

export const dynamic = "force-dynamic";

export default async function PublicarPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in?redirect=/publicar");
  }

  const categorias = await obtenerCategoriasRaiz();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold text-brand-900">Publicar</h1>
      <p className="mt-1 text-sm text-brand-600">
        Completa los datos de tu publicación. Podés subir hasta 8 imágenes.
      </p>
      <PublicarFormulario categorias={categorias} />
    </main>
  );
}
