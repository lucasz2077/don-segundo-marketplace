import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerCategoriaPorSlug } from "@/lib/categories";

export const dynamic = "force-dynamic";

type CategoriaPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CategoriaPage({ params }: CategoriaPageProps) {
  const { slug } = await params;
  const categoria = await obtenerCategoriaPorSlug(slug);

  if (!categoria) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16">
      <Link
        href="/"
        className="text-sm font-medium text-brand-700 underline"
      >
        Volver al inicio
      </Link>

      <h1 className="mt-4 text-3xl font-semibold text-brand-900">
        {categoria.name}
      </h1>

      {categoria.children.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoria.children.map((subcategoria) => (
            <Link
              key={subcategoria.id}
              href={`/categorias/${subcategoria.slug}`}
              className="rounded-lg border border-brand-100 bg-white p-6 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <h2 className="font-semibold text-brand-900">
                {subcategoria.name}
              </h2>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-brand-500">
          Esta categoría aún no tiene subcategorías.
        </p>
      )}
    </main>
  );
}
