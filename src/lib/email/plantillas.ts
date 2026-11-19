/**
 * Plantillas de mails transaccionales en español argentino. HTML simple con
 * estilos en línea (lo que mejor soportan los clientes de correo) y una
 * versión en texto plano. Sin imágenes: muchos clientes las bloquean.
 */

const COLOR_MARCA = "#243c56";
const COLOR_TEXTO = "#1f2f42";
const COLOR_TENUE = "#5b6b7d";

type Contenido = { asunto: string; html: string; texto: string };

/** Escapa texto de usuario (nombres, títulos) antes de insertarlo en HTML. */
export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function primerNombre(nombre: string | null | undefined): string {
  return nombre?.trim().split(/\s+/)[0] || "";
}

function saludo(nombre: string | null | undefined): string {
  const nombreCorto = primerNombre(nombre);
  return nombreCorto ? `Hola, ${nombreCorto}:` : "Hola:";
}

function maqueta({
  titulo,
  parrafos,
  boton,
  pie,
}: {
  titulo: string;
  parrafos: string[];
  boton?: { texto: string; url: string };
  pie?: string;
}): string {
  const cuerpo = parrafos
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${COLOR_TEXTO}">${p}</p>`)
    .join("");
  const accion = boton
    ? `<p style="margin:24px 0"><a href="${escaparHtml(boton.url)}" style="display:inline-block;background:${COLOR_MARCA};color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:12px 24px;border-radius:8px">${escaparHtml(boton.texto)}</a></p>
<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:${COLOR_TENUE}">Si el botón no funciona, copiá este enlace en tu navegador:<br><a href="${escaparHtml(boton.url)}" style="color:${COLOR_MARCA};word-break:break-all">${escaparHtml(boton.url)}</a></p>`
    : "";
  return `<!doctype html>
<html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaparHtml(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f5f8fb;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f8fb;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px 24px">
<tr><td>
<p style="margin:0 0 24px;font-size:20px;font-weight:700;color:${COLOR_MARCA}">Don Segundo</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:30px;color:${COLOR_TEXTO}">${escaparHtml(titulo)}</h1>
${cuerpo}${accion}
<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:${COLOR_TENUE}">${pie ?? "Recibiste este mail porque tenés una cuenta en Don Segundo, el marketplace del campo argentino."}</p>
</td></tr></table></td></tr></table></body></html>`;
}

/** Confirmación de email al registrarse (RF-01). */
export function plantillaVerificacion(nombre: string | null | undefined, url: string): Contenido {
  const asunto = "Confirmá tu email en Don Segundo";
  return {
    asunto,
    html: maqueta({
      titulo: "Confirmá tu email",
      parrafos: [
        escaparHtml(saludo(nombre)),
        "Gracias por sumarte a Don Segundo. Confirmá tu email para poder publicar, comprar y escribirles a los vendedores.",
      ],
      boton: { texto: "Confirmar mi email", url },
      pie: "El enlace vence en 1 hora. Si no creaste una cuenta en Don Segundo, ignorá este mail.",
    }),
    texto: `${saludo(nombre)}\n\nGracias por sumarte a Don Segundo. Confirmá tu email para poder publicar, comprar y escribirles a los vendedores:\n\n${url}\n\nEl enlace vence en 1 hora. Si no creaste una cuenta, ignorá este mail.`,
  };
}

/** Recuperación de contraseña (RF-03). */
export function plantillaRestablecerContrasenia(
  nombre: string | null | undefined,
  url: string
): Contenido {
  const asunto = "Restablecé tu contraseña de Don Segundo";
  return {
    asunto,
    html: maqueta({
      titulo: "Restablecé tu contraseña",
      parrafos: [
        escaparHtml(saludo(nombre)),
        "Recibimos un pedido para cambiar la contraseña de tu cuenta. Tocá el botón para elegir una nueva.",
      ],
      boton: { texto: "Elegir una contraseña nueva", url },
      pie: "El enlace vence en 1 hora. Si no lo pediste vos, ignorá este mail: tu contraseña no cambia.",
    }),
    texto: `${saludo(nombre)}\n\nRecibimos un pedido para cambiar la contraseña de tu cuenta. Elegí una nueva acá:\n\n${url}\n\nEl enlace vence en 1 hora. Si no lo pediste vos, ignorá este mail.`,
  };
}

/** Aviso genérico de actividad (venta, compra, mensaje, devolución; RF-20/RF-23). */
export function plantillaAviso({
  nombre,
  titulo,
  mensaje,
  url,
  textoBoton = "Ver en Don Segundo",
}: {
  nombre: string | null | undefined;
  titulo: string;
  mensaje: string;
  url: string;
  textoBoton?: string;
}): Contenido {
  return {
    asunto: titulo,
    html: maqueta({
      titulo,
      parrafos: [escaparHtml(saludo(nombre)), escaparHtml(mensaje)],
      boton: { texto: textoBoton, url },
    }),
    texto: `${saludo(nombre)}\n\n${mensaje}\n\n${textoBoton}: ${url}`,
  };
}
