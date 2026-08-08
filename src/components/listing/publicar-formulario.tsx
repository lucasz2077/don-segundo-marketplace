"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  crearPublicacionSchema,
  type ImagenPublicacionInput,
} from "@/lib/validation/listing";
import { PROVINCIAS_ARGENTINA } from "@/lib/provincias";

type CategoriaFormulario = {
  id: string;
  name: string;
  slug: string;
  children: Array<{ id: string; name: string; slug: string }>;
};

type PublicarFormularioProps = {
  categorias: CategoriaFormulario[];
};

type ImagenLocal = ImagenPublicacionInput & { preview: string };

const MAX_IMAGENES = 8;

const claseCampo =
  "w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 focus:border-brand-400 focus:outline-none";

const etiquetaCampo = "mb-1 block text-sm font-medium text-brand-900";

/**
 * Formulario de publicación: sube las imágenes a /api/upload y envía los
 * datos a POST /api/listings. Valida con Zod y muestra errores en español.
 */
export function PublicarFormulario({ categorias }: PublicarFormularioProps) {
  const router = useRouter();
  const inputArchivos = useRef<HTMLInputElement>(null);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [condicion, setCondicion] = useState<"NEW" | "USED">("USED");
  const [categoriaId, setCategoriaId] = useState("");
  const [provincia, setProvincia] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [imagenes, setImagenes] = useState<ImagenLocal[]>([]);
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
      const respuesta = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parseado.data),
      });
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        setError(cuerpo?.error?.message ?? "No se pudo publicar. Intenta de nuevo.");
        setEnviando(false);
        return;
      }
      router.push(`/listados/${cuerpo.data.id}`);
      router.refresh();
    } catch {
      setError("No se pudo publicar. Intenta de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="mt-8 flex flex-col gap-6">
      <div>
        <label htmlFor="titulo" className={etiquetaCampo}>
          Título
        </label>
        <input
          id="titulo"
          type="text"
          value={titulo}
          onChange={(evento) => setTitulo(evento.target.value)}
          maxLength={120}
          className={claseCampo}
          required
        />
      </div>

      <div>
        <label htmlFor="descripcion" className={etiquetaCampo}>
          Descripción
        </label>
        <textarea
          id="descripcion"
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
          rows={6}
          maxLength={5000}
          className={claseCampo}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="precio" className={etiquetaCampo}>
            Precio
          </label>
          <div className="flex gap-2">
            <input
              id="precio"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={precio}
              onChange={(evento) => setPrecio(evento.target.value)}
              className={claseCampo}
              required
            />
            <select
              aria-label="Moneda"
              value={moneda}
              onChange={(evento) => setMoneda(evento.target.value as "ARS" | "USD")}
              className={`${claseCampo} w-24`}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="condicion" className={etiquetaCampo}>
            Condición
          </label>
          <select
            id="condicion"
            value={condicion}
            onChange={(evento) => setCondicion(evento.target.value as "NEW" | "USED")}
            className={claseCampo}
          >
            <option value="USED">Usado</option>
            <option value="NEW">Nuevo</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="categoria" className={etiquetaCampo}>
          Categoría
        </label>
        <select
          id="categoria"
          value={categoriaId}
          onChange={(evento) => setCategoriaId(evento.target.value)}
          className={claseCampo}
          required
        >
          <option value="">Selecciona una categoría</option>
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
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="provincia" className={etiquetaCampo}>
            Provincia
          </label>
          <select
            id="provincia"
            value={provincia}
            onChange={(evento) => setProvincia(evento.target.value)}
            className={claseCampo}
            required
          >
            <option value="">Selecciona una provincia</option>
            {PROVINCIAS_ARGENTINA.map((provinciaDisponible) => (
              <option key={provinciaDisponible} value={provinciaDisponible}>
                {provinciaDisponible}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ciudad" className={etiquetaCampo}>
            Ciudad <span className="font-normal text-brand-600">(opcional)</span>
          </label>
          <input
            id="ciudad"
            type="text"
            value={ciudad}
            onChange={(evento) => setCiudad(evento.target.value)}
            maxLength={100}
            className={claseCampo}
          />
        </div>
      </div>

      <div>
        <span className={etiquetaCampo}>Imágenes</span>
        <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {imagenes.map((imagen, indice) => (
            <div
              key={imagen.publicId}
              className="relative aspect-[4/3] overflow-hidden rounded-md border border-brand-100"
            >
              <Image
                src={imagen.preview}
                alt={imagen.alt ?? `Imagen ${indice + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, 200px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => quitarImagen(imagen.publicId)}
                aria-label={`Quitar imagen ${indice + 1}`}
                className="absolute right-1 top-1 rounded bg-brand-900/80 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-danger"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => inputArchivos.current?.click()}
          disabled={imagenes.length >= MAX_IMAGENES}
          className="mt-3 rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {imagenes.length >= MAX_IMAGENES
            ? `Máximo ${MAX_IMAGENES} imágenes`
            : "Subir imágenes"}
        </button>
        <input
          ref={inputArchivos}
          type="file"
          accept="image/*"
          multiple
          onChange={manejarArchivos}
          className="hidden"
          aria-label="Archivos de imagen"
        />
      </div>

      {error ? (
        <p className="rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-accent-500 px-6 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enviando ? "Publicando..." : "Publicar"}
      </button>
    </form>
  );
}
