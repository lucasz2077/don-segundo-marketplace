"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";

type DocumentoSubido = {
  url: string;
  publicId: string;
  nombre: string;
};

type CampoDocumento = "dni" | "domicilio";

const etiquetaCampo =
  "mb-1 block text-sm font-medium text-brand-900 dark:text-bone";

/**
 * Formulario de solicitud de verificación de vendedor (RF-32/RF-35). Sube los
 * documentos (identidad obligatoria, domicilio opcional) a POST /api/upload y
 * al enviar crea la solicitud con POST /api/verificaciones. Copia el patrón de
 * subida de publicar-formulario: el archivo se sube apenas se elige, se guarda
 * { url, publicId } en estado y el envío solo lleva las URLs. Al éxito la
 * página server se refresca (mostrará PENDING); ante 401 redirige a sign-in.
 */
export function FormularioSolicitudVerificacion() {
  const router = useRouter();
  const inputDni = useRef<HTMLInputElement>(null);
  const inputDomicilio = useRef<HTMLInputElement>(null);

  const [dniDocumento, setDniDocumento] = useState<DocumentoSubido | null>(null);
  const [domicilioDocumento, setDomicilioDocumento] =
    useState<DocumentoSubido | null>(null);
  const [subiendo, setSubiendo] = useState<CampoDocumento | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subirDocumento(
    campo: CampoDocumento,
    archivo: File,
    alSubir: (documento: DocumentoSubido) => void
  ) {
    setSubiendo(campo);
    setError(null);
    const formData = new FormData();
    formData.append("imagen", archivo);
    try {
      const respuesta = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (respuesta.status === 401) {
        router.push("/sign-in");
        return;
      }
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        setError(
          cuerpo?.error?.message ?? "No se pudo subir el documento. Intenta de nuevo."
        );
        return;
      }
      const subida = cuerpo.data as {
        url: string;
        publicId: string;
        alt: string | null;
      };
      alSubir({
        url: subida.url,
        publicId: subida.publicId,
        nombre: subida.alt ?? archivo.name,
      });
    } catch {
      setError("No se pudo subir el documento. Intenta de nuevo.");
    } finally {
      setSubiendo(null);
    }
  }

  function manejarDni(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (archivo) {
      void subirDocumento("dni", archivo, setDniDocumento);
    }
    if (inputDni.current) {
      inputDni.current.value = "";
    }
  }

  function manejarDomicilio(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (archivo) {
      void subirDocumento("domicilio", archivo, setDomicilioDocumento);
    }
    if (inputDomicilio.current) {
      inputDomicilio.current.value = "";
    }
  }

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    if (!dniDocumento) {
      setError("Debés subir tu documento de identidad para solicitar la verificación");
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await fetch("/api/verificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dniUrl: dniDocumento.url,
          ...(domicilioDocumento ? { domicilioUrl: domicilioDocumento.url } : {}),
        }),
      });
      if (respuesta.status === 401) {
        router.push("/sign-in");
        return;
      }
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        setError(
          cuerpo?.error?.message ??
            "No se pudo crear la solicitud. Intenta de nuevo."
        );
        setEnviando(false);
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo crear la solicitud. Intenta de nuevo.");
      setEnviando(false);
    }
  }

  function botonArchivo(
    campo: CampoDocumento,
    ref: React.RefObject<HTMLInputElement | null>,
    documento: DocumentoSubido | null,
    etiquetaSubir: string
  ) {
    if (documento) {
      return (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm text-brand-900">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.172 7l-6.586 6.586a2 2 0 0 0 2.828 2.828L18 9.828a4 4 0 0 0-5.656-5.656L6.1 10.414a6 6 0 0 0 8.486 8.486l5.4-5.4"
              />
            </svg>
            <span className="truncate">{documento.nombre}</span>
          </span>
          <button
            type="button"
            onClick={() =>
              campo === "dni" ? setDniDocumento(null) : setDomicilioDocumento(null)
            }
            className="rounded-md border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50"
          >
            Quitar
          </button>
        </div>
      );
    }
    return (
      <div>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={subiendo !== null}
          className="mt-2 rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {subiendo === campo ? "Subiendo..." : etiquetaSubir}
        </button>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          onChange={campo === "dni" ? manejarDni : manejarDomicilio}
          className="hidden"
          aria-label={
            campo === "dni"
              ? "Archivo del documento de identidad"
              : "Archivo del documento de domicilio"
          }
        />
      </div>
    );
  }

  return (
    <form onSubmit={manejarEnvio} className="mt-6 flex flex-col gap-6">
      <div>
        <span className={etiquetaCampo}>
          Documento de identidad <span className="text-danger">*</span>
        </span>
        <p className="text-sm text-brand-600">
          Una foto legible de tu DNI por delante.
        </p>
        <div id="documento-dni">{botonArchivo("dni", inputDni, dniDocumento, "Subir documento")}</div>
      </div>

      <div>
        <span className={etiquetaCampo}>
          Documento de domicilio{" "}
          <span className="font-normal text-brand-600 dark:text-brand-300">
            (opcional)
          </span>
        </span>
        <p className="text-sm text-brand-600">
          Por ejemplo, una boleta de un servicio a tu nombre.
        </p>
        <div id="documento-domicilio">
          {botonArchivo("domicilio", inputDomicilio, domicilioDocumento, "Subir documento")}
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <Boton
        type="submit"
        cargando={enviando}
        className="w-full sm:w-auto"
      >
        {enviando ? "Enviando solicitud..." : "Solicitar verificación"}
      </Boton>
    </form>
  );
}