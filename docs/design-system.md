# Sistema de diseño — Don Segundo

Documento vivo del sistema visual y del proyecto de reconstrucción estética. Objetivo: un marketplace que se vea **confiable y profesional**, con la claridad de un gran marketplace (jerarquía, precio protagonista, descubrimiento rápido, señales de confianza) y la identidad propia de Don Segundo. Catálogo navegable en `/sistema-de-disenio` (solo en desarrollo y previews de Vercel; en producción responde 404).

## 1. Identidad

- **Logo:** gaucho de espaldas dibujado a trazo + "Don Segundo" en serif + "-1936-". Vectorizado desde el original en `public/marca/`:
  - `isotipo-{crema,azul}.svg`: solo el gaucho.
  - `nombre-{crema,azul}.svg`: logotipo "Don Segundo".
  - `logo-{crema,azul}.svg`: versión completa vertical (isotipo, nombre y año).
  - Crema sobre fondos azules, azul sobre fondos claros. En código se usa `<Logo>` (`src/components/ui/logo.tsx`).
- **Íconos de la app:** `src/app/icon.svg`, `apple-icon.png` y `favicon.ico` (isotipo crema sobre cuadrado azul `#203d5b`).
- **Íconos de interfaz:** `lucide-react`, único set permitido. Siempre `aria-hidden="true"` cuando acompañan texto; tamaños `size-4` (texto sm), `size-5` (botones lg, navegación) y `size-7` (estados vacíos).
- **Modo oscuro:** desactivado. El sitio es solo claro (`color-scheme: light`). La variante `dark:` quedó atada a una clase `.dark` que nunca se aplica, así las utilidades `dark:*` heredadas no tienen efecto. Se borran al rediseñar cada página.

## 2. Tokens (`src/app/globals.css`)

| Grupo | Tokens | Uso |
|---|---|---|
| Marca | `brand-50…950` (azul acero) | Acciones primarias, navegación, texto |
| Acento | `accent-300…700` (dorado trigo) | Acción de marca de alto impacto (Publicar, Comprar), estrellas |
| Crema | `crema` | Trazo del logo sobre azul |
| Neutros cálidos | `sand-50…950` | Estados inactivos o archivados (p. ej. compra expirada) |
| Semánticos | `success`, `danger`, `warning`, `warning-fuerte` | Estados; `warning-fuerte` para texto de advertencia (AA) |
| Roles | `fondo`, `superficie`, `superficie-alt`, `tinta`, `tinta-suave`, `tinta-tenue`, `linea`, `linea-fuerte` | **Preferir en código nuevo** en lugar de tonos crudos |
| Tipografía | `font-sans` (Geist), `font-marca` (Alegreya), `font-mono` | Interfaz / títulos de marca / código |
| Layout | `max-w-sitio` (75rem) | Ancho del contenido; usar `<Contenedor>` |
| Radios | `rounded-card` (0.75rem), `rounded-control` (0.5rem), `rounded-full` (insignias, avatares) | |
| Sombras | `shadow-card`, `shadow-card-hover`, `shadow-modal`, `shadow-header` | |

Reglas:

- El lienzo es `bg-fondo` (hueso). El contenido va en superficies blancas (`Tarjeta`).
- **Tinta:** `tinta` para títulos y texto principal, `tinta-suave` para secundario y `tinta-tenue` para metadatos y ayudas. Las tres cumplen AA. No usar `brand-400/500` para texto chico.
- `font-marca` solo en momentos de marca (hero, títulos destacados), nunca en párrafos ni controles.
- Sin valores arbitrarios salvo justificación comentada (ver `src/AGENTS.md` §6).

## 3. Primitivas (`src/components/ui/`)

| Componente | Para qué |
|---|---|
| `Boton` | Acciones en la página. Variantes `primario`, `acento`, `secundario`, `fantasma`, `peligro`, `texto`. Tamaños `sm`/`md`/`lg`, `anchoCompleto` y `cargando` (spinner + aria-busy). |
| `BotonEnlace` | Navegación con forma de botón (`next/link`). Si navega es enlace; si ejecuta algo, `Boton`. |
| `clasesBoton()` | Las mismas clases para casos especiales (p. ej. `<a>` nativo hacia OAuth de MP). |
| `Campo` + `Entrada` / `Selector` / `AreaTexto` | Formularios: etiqueta, marca de requerido u opcional, ayuda y error con `aria-describedby` (`describirCampo`), estado `invalido`. `clasesControl()` para controles especiales. |
| `Insignia` | Estados y atributos. Tonos `neutro`, `marca`, `acento`, `exito`, `advertencia`, `peligro`, `inactivo`, con ícono opcional. |
| `Precio` | Precio protagonista: `$` / `US$`, miles con punto, centavos en superíndice solo si existen, texto accesible con nombre de moneda. Sin float (`partesPrecio`). |
| `Migas` | Breadcrumb con `aria-current="page"`. |
| `Paginacion` | Paginación numerada por enlaces con saltos (`paginasVisibles`). Server Component. |
| `Avatar` | Foto o iniciales (`inicialesDe`). Decorativo. |
| `Alerta` | Mensajes info, éxito, advertencia o peligro, con título y acción. Peligro usa `role="alert"`; el resto, `role="status"`. |
| `EstadoVacio` | Qué falta + acción útil, con ícono opcional. |
| `EstadoError` | Error con acción de recuperación (es una `Alerta` de peligro). |
| `Skeleton` | Carga; sin animación con `prefers-reduced-motion`. |
| `Tarjeta` | Superficie base (borde, sombra mínima). `relleno` `ninguno`/`sm`/`md`. |
| `Contenedor` | Ancho del sitio y márgenes laterales. |
| `Logo` | Logo horizontal o solo isotipo, crema o azul. |
| `unirClases()` | Unir clases condicionales (no resuelve conflictos: `className` extiende la base). |

## 4. Shell global (`src/components/layout/`)

- **Header** (`navbar.tsx`), en azul de marca:
  - Fila principal: logo crema, buscador central (`buscador-header.tsx`, GET a `/listados`), Publicar (acento), favoritos, mensajes y notificaciones con burbuja de no leídos (`contador-no-leidos.tsx`), y menú de cuenta (`menu-usuario.tsx`).
  - Barra secundaria (desde `lg`): menú "Categorías" (`menu-categorias.tsx`) con raíces y subcategorías, y accesos directos.
  - Debajo de `lg`: el buscador pasa a una segunda línea y la navegación vive en el menú lateral (`menu-movil.tsx`, `<dialog>` nativo).
- **Footer** (`pie-pagina.tsx`): franja de garantías (pago con Mercado Pago, vendedores verificados, 7 días para devolver) y columnas de enlaces. Solo muestra garantías respaldadas por funcionalidades reales.
- **Fuente única de enlaces:** los destinos de navegación salen de `enlaces-navegacion.ts`, para que menú, cajón y footer no diverjan.
- **Íconos por categoría:** `src/components/categorias/icono-categoria.ts`, por slug.
- **Categorías de navegación:** `categorias-navegacion.ts` las pide una vez por request (React `cache`). Si la base falla, la navegación se muestra sin categorías.
- **Estados globales:** `src/app/not-found.tsx` (404 con header y footer), `src/app/error.tsx` (reintentar con `retry`) y `src/app/global-error.tsx` (falla del layout raíz).
- **Accesibilidad:** enlace "Saltar al contenido" hacia `#contenido`.

## 5. Descubrimiento (mobile-first)

La mayoría de los usuarios entra desde el celular: cada pantalla se diseña primero para 360–430px y se expande hacia desktop.

- **`TarjetaPublicacion`** (`src/components/listing/`):
  - `disposicion="grilla"`: siempre vertical (inicio, categoría, favoritos, perfil del vendedor).
  - `disposicion="adaptable"`: horizontal en mobile y vertical desde `sm` (resultados de búsqueda).
  - Contenido: condición (+ "Última unidad"), título en dos líneas, `Precio`, ubicación, sello verificado y reputación compacta ("★ 4,6 (12)", RF-52).
  - Toda la tarjeta es clickeable a través del enlace del título.
- **Listado** (`/listados`):
  - En mobile, barra fija con "Filtrar" (`DialogoFiltros`, hoja inferior con `<dialog>`) y "Ordenar" (`SelectorOrden`).
  - Desde `lg`, sidebar con `PanelFiltros`. Categoría y condición son enlaces (un toque aplica); ubicación y precio van en un formulario GET.
  - `ChipsFiltros` permite quitar filtros, y la paginación es numerada.
  - Las URLs se arman con `urlListados()` (`url-listados.ts`).
- **Categoría** (`/categorias/[slug]`): migas, chips de subcategorías con scroll horizontal y publicaciones de la categoría y sus hijas, con paginación.
- **Inicio**:
  - Hero compacto con acciones y señales de confianza.
  - Categorías en fila con scroll y snap en mobile, grilla de 7 en desktop.
  - Recién publicadas (2 columnas en mobile) y llamado a vender.
- **Scroll horizontal en mobile:** `-mx-4 px-4` para llegar al borde y `scroll-px-4` si hay snap.

## 6. Conversión

- **Detalle** (`/listados/[id]`):
  - Mobile: galería a todo el ancho, caja de compra, descripción, vendedor, reseñas y publicaciones similares (de la categoría raíz).
  - Desde `lg`: grilla de 12 columnas con la caja de compra fija a la derecha (`sticky`).
- **`GaleriaImagenes`:**
  - Carrusel con `scroll-snap` nativo (sin librerías). El índice activo se deriva del scroll.
  - Contador "1 / N" y corazón de favorito siempre visible.
  - Flechas y miniaturas desde `sm`.
- **`BarraCompraMovil`:** barra fija inferior con precio y "Comprar ahora" debajo de `lg`. Con `IntersectionObserver` aparece cuando la caja de compra sale por arriba y se oculta al llegar al footer.
- **Caja de compra:**
  - Condición y vendidos, título, `Precio` xl, alertas de estado (pausada, rechazada, vendida), stock y ubicación.
  - Acciones: Comprar (acento) y Preguntar al vendedor (secundario, formulario inline).
  - Garantías reales (Mercado Pago, 7 días para devolver).
  - Para el dueño: alerta "Esta es tu publicación" con vistas, vendidos, Editar y Eliminar con confirmación.
- **Vendedor:** avatar, sello, nombre comercial, reputación (RF-52), "Ver perfil y publicaciones" y "Reportar publicación" en tono discreto.
- **Perfil del vendedor** (`/vendedores/[id]`):
  - Encabezado de tienda con banda de marca, avatar superpuesto, sello y nombre comercial.
  - Indicadores (calificación, tiempo de respuesta, en venta), bio y publicaciones en grilla de 2 columnas en mobile.
- Los botones de acción (`BotonComprar`, `BotonContactar`, `BotonReportar`, `BotonEliminarPublicacion`, `BotonFavorito`) usan las primitivas; su lógica no cambió.

## 7. Área de cuenta

- **`PaginaCuenta`** (`src/components/cuenta/`): envoltorio común.
  - Desde `lg`: navegación lateral fija (`NavCuenta`, marca la sección con `aria-current`).
  - En mobile: regreso "‹ Mi cuenta" arriba del título.
  - Encabezado con título, descripción y acción principal.
- **Secciones:** salen de `secciones-cuenta.ts` (Compras, Ventas, Actividad, Mis datos).
- **`/perfil`:** en mobile es el menú de la cuenta (filas tocables con ícono, descripción y chevron). Muestra el saludo, accesos a Publicar y al perfil público, y el estado de Mercado Pago como `Alerta`.
- **Mis compras:** `TarjetaCompra` con insignia de estado de pago, precio, medio de pago y acciones (calificar, devolución) separadas por un divisor.
- **Favoritos:** grilla de 2 columnas en mobile; el corazón lleno sobre la foto quita el favorito.
- **Mis publicaciones:** fila con miniatura, insignia de estado, precio, vendidas y acciones con ícono (Ver, Pausar/Reanudar, Editar).
- **Mensajes:**
  - Bandeja con foto de la publicación, nombre, hora corta ("08:04" hoy, "12/10" antes), vista previa y burbuja de no leídos.
  - Chat con encabezado compacto (volver, avatar, publicación), burbujas, doble check de leído y composer con botón de enviar redondo.
- **Notificaciones:** lista con ícono por tipo, punto de "nueva" y paginación numerada.
- **Publicar:**
  - Formulario por secciones: fotos primero (grilla con portada y tile "Agregar fotos"), qué vendés (condición como botones), precio y stock, ubicación y descripción.
  - Botón de envío fijo abajo en mobile.
- **Formularios de datos** (información, direcciones, perfil público, verificación, devoluciones): usan `clasesControl()`, `clasesBoton()` y tokens de aviso.

## 8. Plan de reconstrucción estética

| Fase | Alcance | Estado |
|---|---|---|
| 1. Fundaciones | Tokens, tipografía (fix: el `body` forzaba Arial), modo oscuro desactivado, logo vectorizado e íconos de app, `lucide-react`, primitivas y catálogo `/sistema-de-disenio` | **Completada** |
| 2. Shell global | Header con logo, buscador central y menú de usuario; barra de categorías; cajón mobile; footer con garantías; `not-found` y `error` globales | **Completada** |
| 3. Descubrimiento | Home (hero, categorías con ícono, recién publicadas, llamado a vender); `TarjetaPublicacion` v2; listado con filtros (sidebar / hoja inferior en mobile), chips, orden y paginación numerada; página de categoría con publicaciones | **Completada** |
| 4. Conversión | Detalle con breadcrumb, galería táctil, caja de compra (barra fija en mobile), garantías, vendedor, reseñas y similares; perfil público del vendedor | **Completada** |
| 5. Área de cuenta | Layout "Mi cuenta" con navegación lateral; compras, publicaciones, favoritos, mensajes, notificaciones; formulario de publicar por secciones | **Completada** |
| 6. Auth, pagos, admin y estados | Sign-in/up con panel de marca, `/pagos/resultado`, tablas de admin, `loading.tsx`, microcopy en voseo | Pendiente |
| 7. QA visual | Capturas Playwright (mobile/tablet/desktop), accesibilidad (foco, contraste, headings), lint y build | Pendiente |

Pendientes detectados fuera del alcance visual (requieren autorización de backend, ver `src/AGENTS.md` §12):

- Filtrar por categoría raíz no devuelve resultados: `src/lib/listings.ts` filtra por `categoryId` exacto y las publicaciones cuelgan de subcategorías. Hay que incluir las hijas.
- Los conteos de publicaciones por categoría (para la home) necesitan una consulta nueva.
