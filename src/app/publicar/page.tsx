import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { obtenerCategoriasRaiz } from "@/lib/categories";
import { esEditable, obtenerPublicacion, puedePublicar } from "@/lib/listings";
import { obtenerCuentaMpVigente } from "@/lib/pagos/oauth";
import { ExternalLink } from "lucide-react";
import { PublicarFormulario } from "@/components/listing/publicar-formulario";
import { Alerta } from "@/components/ui/alerta";
import { clasesBoton } from "@/components/ui/boton";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { Contenedor } from "@/components/ui/contenedor";
import { Migas } from "@/components/ui/migas";

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
  // RF-08: vendida, rechazada o eliminada ya no se edita.
  let edicionBloqueada = false;
  if (listingId) {
    const publicacion = await obtenerPublicacion(listingId);
    // noNota: inexistente → 404; ajena a este usuario → redirige al listado.
    if (!publicacion) {
      notFound();
    }
    if (publicacion.ownerId !== session.user.id) {
      redirect("/listados");
    }
    edicionBloqueada = !esEditable(publicacion);
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

  // RF-07: una cuenta solo compradora no puede publicar.
  const cuentaVendedora = await puedePublicar(session.user.id);
  const categorias = await obtenerCategoriasRaiz();

  // Aviso RF-47: sin cuenta de Mercado Pago vigente no se puede publicar.
  // La resolución es server-side; al cliente solo llega el booleano (RNF-20).
  const cuentaMpVigente = await obtenerCuentaMpVigente(session.user.id);

  return (
    <Contenedor as="main" className="flex-1 py-4 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <div className="hidden sm:block">
          <Migas
            items={[
              { etiqueta: "Inicio", href: "/" },
              ...(esEdicion
                ? [{ etiqueta: "Mis publicaciones", href: "/perfil/publicaciones" }]
                : []),
              { etiqueta: esEdicion ? "Editar publicación" : "Publicar" },
            ]}
          />
        </div>
        <h1 className="mt-1 font-marca text-3xl font-medium text-tinta sm:mt-3 sm:text-4xl">
          {esEdicion ? "Editar publicación" : "¿Qué querés vender?"}
        </h1>
        <p className="mt-1 text-sm text-tinta-tenue">
          {esEdicion
            ? "Actualizá los datos de tu publicación. Los cambios se ven al instante."
            : "Completá los datos en pocos minutos. Una buena foto y un buen título venden más."}
        </p>

        {!cuentaMpVigente && cuentaVendedora && !edicionBloqueada ? (
          <div className="mt-5">
            {/* `<a>` nativo: la ruta redirige a Mercado Pago y el prefetch de
                `<Link>` choca con CORS (ver /perfil). */}
            <Alerta
              tono="advertencia"
              titulo="Vinculá tu cuenta de Mercado Pago para publicar"
              accion={
                <a href="/api/pagos/oauth/iniciar" className={clasesBoton({ tamanio: "sm" })}>
                  Vincular Mercado Pago
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              }
            >
              Tus ventas se cobran directo en tu cuenta de Mercado Pago, así que es requisito
              tenerla vinculada y vigente.
            </Alerta>
          </div>
        ) : null}

        {edicionBloqueada ? (
          <div className="mt-5">
            <Alerta
              tono="info"
              titulo="Esta publicación ya no se puede editar"
              accion={
                <BotonEnlace href="/perfil/publicaciones" variante="secundario" tamanio="sm">
                  Ver mis publicaciones
                </BotonEnlace>
              }
            >
              Está vendida, rechazada por moderación o eliminada. Si querés volver a vender,
              creá una publicación nueva.
            </Alerta>
          </div>
        ) : !cuentaVendedora ? (
          <div className="mt-5">
            <Alerta
              tono="advertencia"
              titulo="Tu cuenta es solo de comprador"
              accion={
                <BotonEnlace href="/perfil/informacion" tamanio="sm">
                  Cambiar tipo de cuenta
                </BotonEnlace>
              }
            >
              Para publicar, cambiá el tipo de cuenta a &quot;Vendedor&quot; o &quot;Comprador y
              vendedor&quot; en tu información personal.
            </Alerta>
          </div>
        ) : (
          <div className="mt-5">
            <PublicarFormulario
              categorias={categorias}
              listingId={listingId}
              publicacionInicial={publicacionInicial}
            />
          </div>
        )}
      </div>
    </Contenedor>
  );
}
