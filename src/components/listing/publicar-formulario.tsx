"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  crearPublicacionSchema,
  type ImagenPublicacionInput,
} from "@/lib/validation/listing";
import { PROVINCIAS_ARGENTINA } from "@/lib/provincias";
import { Check, ImagePlus, X } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, Entrada, Selector } from "@/components/ui/campo";
import { unirClases } from "@/components/ui/unir-clases";

type CategoriaFormulario = {
  id: string;
  name: string;
  slug: string;
  children: Array<{ id: string; name: string; slug: string }>;
};

type ImagenInicial = {
  url: string;
  publicId: string;
  alt: string | null;
};

export type PublicacionInicial = {
  titulo: string;
  descripcion: string;
  precio: string;
  moneda: "ARS" | "USD";
  condicion: "NEW" | "USED";
  stock: number;
  categoriaId: string;
  provincia: string;
  ciudad: string;
  imagenes: ImagenInicial[];
};

type PublicarFormularioProps = {
  categorias: CategoriaFormulario[];
  listingId?: string;
  publicacionInicial?: PublicacionInicial;
};

type ImagenLocal = ImagenPublicacionInput & { preview: string };

const MAX_IMAGENES = 8;

function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-linea bg-superficie p-4 shadow-card sm:p-6">
      <h2 className="text-base font-semibold text-tinta">{titulo}</h2>
      {descripcion ? <p className="mt-0.5 text-sm text-tinta-tenue">{descripcion}</p> : null}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

/**
 * Formulario de publicación/edición: en modo creación envía el payload a
 * POST /api/listings; en modo edición (listingId presente) a
 * PATCH /api/listings/[id]. Sube las imágenes a /api/upload y valida con Zod.
 * Organizado en secciones (fotos, qué vendés, precio y stock, ubicación,
 * descripción) con el botón de envío fijo abajo en mobile.
 */
export function PublicarFormulario({
  categorias,
  listingId,
  publicacionInicial,
}: PublicarFormularioProps) {
  const router = useRouter();
  const inputArchivos = useRef<HTMLInputElement>(null);
  const esEdicion = Boolean(listingId);

  const [titulo, setTitulo] = useState(publicacionInicial?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(
    publicacionInicial?.descripcion ?? ""
  );
  const [precio, setPrecio] = useState(publicacionInicial?.precio ?? "");
  const [moneda, setMoneda] = useState<"ARS" | "USD">(
    publicacionInicial?.moneda ?? "ARS"
  );
  const [condicion, setCondicion] = useState<"NEW" | "USED">(
    publicacionInicial?.condicion ?? "USED"
  );
  const [stock, setStock] = useState(
    publicacionInicial?.stock ? String(publicacionInicial.stock) : "1"
  );
  const [categoriaId, setCategoriaId] = useState(
    publicacionInicial?.categoriaId ?? ""
  );
  const [provincia, setProvincia] = useState(publicacionInicial?.provincia ?? "");
  const [ciudad, setCiudad] = useState(publicacionInicial?.ciudad ?? "");
  const [imagenes, setImagenes] = useState<ImagenLocal[]>(
    publicacionInicial?.imagenes.map((imagen) => ({
      url: imagen.url,
      publicId: imagen.publicId,
      alt: imagen.alt ?? undefined,
      // En modo edición la "vista previa" es la propia URL de Cloudinary.
      preview: imagen.url,
    })) ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function subirArchivos(archivos: File[]) {
    const disponibles = MAX_IMAGENES - imagenes.length;
    const seleccionados = archivos.slice(0, disponibles);
    if (seleccionados.length < archivos.length) {
      setError(`Máximo ${MAX_IMAGENES} imágenes por publicación`);
    }

    for (const archivo of seleccionados) {
      const formData = new FormData();
      formData.append("imagen", archivo);
      try {
        const respuesta = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const cuerpo = await respuesta.json().catch(() => null);
        if (!respuesta.ok) {
          setError(cuerpo?.error?.message ?? "No se pudo subir una imagen");
          continue;
        }
        const subida = cuerpo.data as { url: string; publicId: string; alt: string };
        setImagenes((previas) => [
          ...previas,
          {
            url: subida.url,
            publicId: subida.publicId,
            alt: subida.alt ?? null,
            preview: URL.createObjectURL(archivo),
          },
        ]);
      } catch {
        setError("No se pudo subir una imagen. Intenta de nuevo.");
      }
    }
  }

  function quitarImagen(publicId: string) {
    setImagenes((previas) => previas.filter((imagen) => imagen.publicId !== publicId));
  }

  function manejarArchivos(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(evento.target.files ?? []);
    if (archivos.length > 0) {
      void subirArchivos(archivos);
    }
    if (inputArchivos.current) {
      inputArchivos.current.value = "";
    }
  }

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    if (imagenes.length === 0) {
      setError("Debes subir al menos una imagen");
      return;
    }

    const parseado = crearPublicacionSchema.safeParse({
      title: titulo,
      description: descripcion,
      price: Number(precio),
      currency: moneda,
      condition: condicion,
      stock: Number(stock),
      categoryId: categoriaId,
      province: provincia,
      city: ciudad || undefined,
      imagenes: imagenes.map(({ url, publicId, alt }) => ({
        url,
        publicId,
        alt: alt ?? undefined,
      })),
    });

    if (!parseado.success) {
      setError(parseado.error.issues[0]?.message ?? "Revisa los datos del formulario");
      return;
    }

    setEnviando(true);
    try {
      const ruta = esEdicion
        ? `/api/listings/${listingId}`
        : "/api/listings";
      const respuesta = await fetch(ruta, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parseado.data),
      });
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        setError(
          cuerpo?.error?.message ??
            (esEdicion
              ? "No se pudo guardar los cambios. Intenta de nuevo."
              : "No se pudo publicar. Intenta de nuevo.")
        );
        setEnviando(false);
        return;
      }
      const destino = esEdicion
        ? `/listados/${listingId}`
        : `/listados/${cuerpo.data.id}`;
      router.push(destino);
      router.refresh();
    } catch {
      setError(
        esEdicion
          ? "No se pudo guardar los cambios. Intenta de nuevo."
          : "No se pudo publicar. Intenta de nuevo."
      );
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="flex flex-col gap-4 sm:gap-6">
      <Seccion
        titulo="Fotos"
        descripcion={`Hasta ${MAX_IMAGENES} fotos. La primera es la portada: mostrá el producto completo y con buena luz.`}
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
          {imagenes.map((imagen, indice) => (
            <div
              key={imagen.publicId}
              className="relative aspect-square overflow-hidden rounded-control border border-linea bg-brand-50"
            >
              <Image
                src={imagen.preview}
                alt={imagen.alt ?? `Imagen ${indice + 1}`}
                fill
                sizes="(max-width: 640px) 33vw, 160px"
                className="object-cover"
              />
              {indice === 0 ? (
                <span className="absolute bottom-1 left-1 rounded-full bg-brand-950/75 px-2 py-0.5 text-xs font-medium text-white">
                  Portada
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => quitarImagen(imagen.publicId)}
                aria-label={`Quitar imagen ${indice + 1}`}
                className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-brand-950/75 text-white hover:bg-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {imagenes.length < MAX_IMAGENES ? (
            <button
              type="button"
              onClick={() => inputArchivos.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-brand-300 bg-brand-50/50 text-brand-700 hover:border-brand-500 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <ImagePlus className="size-6" aria-hidden="true" />
              <span className="text-xs font-semibold">Agregar fotos</span>
            </button>
          ) : null}
        </div>
        <p className="text-xs text-tinta-tenue">
          {imagenes.length} de {MAX_IMAGENES} fotos
        </p>
        <input
          ref={inputArchivos}
          type="file"
          accept="image/*"
          multiple
          onChange={manejarArchivos}
          className="hidden"
          aria-label="Archivos de imagen"
        />
      </Seccion>

      <Seccion titulo="Qué vendés">
        <Campo
          id="titulo"
          etiqueta="Título"
          requerido
          ayuda={`Marca, modelo y lo más importante. ${titulo.length}/120`}
        >
          <Entrada
            id="titulo"
            type="text"
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            maxLength={120}
            placeholder="Ej.: Tractor John Deere 5090E 4x4 con pala"
            aria-describedby="titulo-ayuda"
            required
          />
        </Campo>
        <Campo id="categoria" etiqueta="Categoría" requerido>
          <Selector
            id="categoria"
            value={categoriaId}
            onChange={(evento) => setCategoriaId(evento.target.value)}
            required
          >
            <option value="">Elegí una categoría</option>
            {categorias.map((categoria) => (
              <optgroup key={categoria.id} label={categoria.name}>
                <option value={categoria.id}>{categoria.name}</option>
                {categoria.children.map((hija) => (
                  <option key={hija.id} value={hija.id}>
                    {hija.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Selector>
        </Campo>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-tinta">Condición</legend>
          <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
            {(
              [
                ["USED", "Usado"],
                ["NEW", "Nuevo"],
              ] as const
            ).map(([valor, etiqueta]) => (
              <label
                key={valor}
                className={unirClases(
                  "flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-control border text-sm font-medium has-focus-visible:ring-2 has-focus-visible:ring-brand-500",
                  condicion === valor
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-linea-fuerte bg-superficie text-tinta-suave hover:border-brand-300",
                )}
              >
                <input
                  type="radio"
                  name="condicion"
                  value={valor}
                  checked={condicion === valor}
                  onChange={() => setCondicion(valor)}
                  className="sr-only"
                />
                {condicion === valor ? <Check className="size-4" aria-hidden="true" /> : null}
                {etiqueta}
              </label>
            ))}
          </div>
        </fieldset>
      </Seccion>

      <Seccion titulo="Precio y stock">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="precio" etiqueta="Precio" requerido>
            <div className="flex gap-2">
              <Selector
                aria-label="Moneda"
                value={moneda}
                onChange={(evento) => setMoneda(evento.target.value as "ARS" | "USD")}
                className="w-28 shrink-0"
              >
                <option value="ARS">$ ARS</option>
                <option value="USD">US$ USD</option>
              </Selector>
              <Entrada
                id="precio"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={precio}
                onChange={(evento) => setPrecio(evento.target.value)}
                placeholder="0"
                required
              />
            </div>
          </Campo>
          <Campo
            id="stock"
            etiqueta="Unidades disponibles"
            requerido
            ayuda="Cuántas unidades tenés para vender."
          >
            <Entrada
              id="stock"
              type="number"
              inputMode="numeric"
              min={1}
              max={9999}
              step={1}
              value={stock}
              onChange={(evento) => setStock(evento.target.value)}
              aria-describedby="stock-ayuda"
              required
            />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Ubicación" descripcion="Dónde está el producto, para que los compradores calculen el retiro o el flete.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="provincia" etiqueta="Provincia" requerido>
            <Selector
              id="provincia"
              value={provincia}
              onChange={(evento) => setProvincia(evento.target.value)}
              required
            >
              <option value="">Elegí una provincia</option>
              {PROVINCIAS_ARGENTINA.map((provinciaDisponible) => (
                <option key={provinciaDisponible} value={provinciaDisponible}>
                  {provinciaDisponible}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo id="ciudad" etiqueta="Ciudad o localidad" opcional>
            <Entrada
              id="ciudad"
              type="text"
              value={ciudad}
              onChange={(evento) => setCiudad(evento.target.value)}
              maxLength={100}
              placeholder="Ej.: Pergamino"
            />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Descripción" descripcion="Estado, año, horas de uso, accesorios y condiciones de entrega.">
        <Campo id="descripcion" etiqueta="Descripción" requerido ayuda={`${descripcion.length}/5000`}>
          <AreaTexto
            id="descripcion"
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
            rows={7}
            maxLength={5000}
            aria-describedby="descripcion-ayuda"
            required
          />
        </Campo>
      </Seccion>

      {error ? (
        <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {/* Envío fijo abajo en mobile: siempre a mano al terminar de cargar. */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-linea bg-superficie/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Boton
          type="submit"
          variante="acento"
          tamanio="lg"
          cargando={enviando}
          className="w-full sm:w-auto sm:min-w-56"
        >
          {enviando
            ? esEdicion
              ? "Guardando..."
              : "Publicando..."
            : esEdicion
              ? "Guardar cambios"
              : "Publicar"}
        </Boton>
      </div>
    </form>
  );
}
