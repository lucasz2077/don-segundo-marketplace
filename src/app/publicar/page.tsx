import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { obtenerCategoriasRaiz } from "@/lib/categories";
import { obtenerPublicacion } from "@/lib/listings";
import { PublicarFormulario } from "@/components/listing/publicar-formulario";

export const dynamic = "force-dynamic";

type PublicarPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function leerTexto(valor: string | string[] | undefined): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor : undefined;
}

export default async function PublicarPage({ searchParams }: PublicarPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in?redirect=/publicar");
  }

  const { id } = await searchParams;
  const listingId = leerTexto(id);

  let publicacionInicial: Parameters<typeof PublicarFormulario>[0]["publicacionInicial"];
  if (listingId) {
    const publicacion = await obtenerPublicacion(listingId);
    // noNota: inexistente → 404; ajena a este usuario → redirige al listado.
    if (!publicacion) {
      notFound();
    }
    if (publicacion.ownerId !== session.user.id) {
      redirect("/listados");
    }
    publicacionInicial = {
      titulo: publicacion.title,
      descripcion: publicacion.description,
      precio: publicacion.price.toString(),
      moneda: publicacion.currency,
      condicion: publicacion.condition,
      categoriaId: publicacion.categoryId,
      provincia: publicacion.province,
      ciudad: publicacion.city ?? "",
      imagenes: publicacion.images.map((imagen) => ({
        url: imagen.url,
        publicId: imagen.publicId,
        alt: imagen.alt,
      })),
    };
  }

  // La última parte del título del formulario se negocia en el cliente; aquí
  // solo cambia la cabecera de la página.
  const esEdicion = Boolean(listingId);

  const categorias = await obtenerCategoriasRaiz();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold text-brand-900 dark:text-bone">
        {esEdicion ? "Editar publicación" : "Publicar"}
      </h1>
      <p className="mt-1 text-sm text-brand-600 dark:text-bone">
        {esEdicion
          ? "Actualizá los datos de tu publicación. Podés cambiar hasta 8 imágenes."
          : "Completa los datos de tu publicación. Podés subir hasta 8 imágenes."}
      </p>
      <PublicarFormulario
        categorias={categorias}
        listingId={listingId}
        publicacionInicial={publicacionInicial}
      />
    </main>
  );
}