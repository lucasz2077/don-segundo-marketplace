import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { obtenerCategoriasRaiz } from "@/lib/categories";
import { obtenerPublicacion } from "@/lib/listings";
import { obtenerCuentaMpVigente } from "@/lib/pagos/oauth";
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
      stock: publicacion.stock,
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

  // Aviso RF-47: sin cuenta de Mercado Pago vigente no se puede publicar.
  // La resolución es server-side; al cliente solo llega el booleano (RNF-20).
  const cuentaMpVigente = await obtenerCuentaMpVigente(session.user.id);

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
      {!cuentaMpVigente && (
        <div
          role="alert"
          aria-label="Mercado Pago"
          className="mt-6 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-brand-900"
        >
          <p className="text-sm">
            Para publicar necesitás una cuenta de Mercado Pago vinculada y
            vigente. Tus ventas se cobran a través de ella.
          </p>
          <Link
            href="/api/pagos/oauth/iniciar"
            className="w-fit rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            Vincular Mercado Pago
          </Link>
        </div>
      )}
      <PublicarFormulario
        categorias={categorias}
        listingId={listingId}
        publicacionInicial={publicacionInicial}
      />
    </main>
  );
}