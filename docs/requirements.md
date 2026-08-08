# Requisitos del producto — marketplace-campo

## 1. Alcance del MVP

### Qué entra (MVP)

- Registro y autenticación de usuarios (comprador y vendedor).
- Perfiles básicos de usuario con tipo de cuenta (comprador, vendedor, o ambos).
- CRUD de publicaciones con imágenes, precio, ubicación, categoría y condición.
- Navegación por categorías del dominio rural.
- Búsqueda con filtros por categoría, ubicación, rango de precio y condición.
- Detalle de publicación con datos del vendedor.
- Contacto directo comprador-vendedor (sin chat en tiempo real; ver notas).
- Favoritos (guardar publicaciones).
- Moderación básica (reporte de publicaciones y baja administrativa).
- Notificaciones básicas (por contacto recibido y estado de la publicación).
- Deploy en producción sobre Vercel + Supabase + Cloudinary.

### Non-goals (lo que NO entra en el MVP)

| Non-goal | Justificación |
| --- | --- |
| Pagos procesados / escrow | Fase posterior (Fase 3). El MVP solo facilita el contacto; la transacción se cierra fuera de plataforma. |
| Logística / envíos / fletes integrados | Fase posterior. La ubicación y el contacto directo cubren la necesidad inicial. |
| Ratings y reseñas | Fase posterior (Fase 3). Requiere una masa crítica de transacciones para ser útil. |
| Chat en tiempo real | Fase posterior (Fase 2). El MVP usa mensajes asincrónicos o redirección al contacto (WhatsApp / teléfono / email). |
| Verificación de vendedores / identidad | Fase posterior (Fase 3). |
| Planes premium / publicidad pagada | Fase posterior (Fase 4). |
| App móvil nativa | Fase posterior (Fase 4). El MVP es web responsive. |
| Pasarela de pagos en ninguna modalidad | No se procesa dinero en ninguna fase del MVP. |

## 2. Requisitos funcionales

### Autenticación y cuentas

- **RF-01 — Registro de usuario:** el usuario puede registrarse con email y contraseña, o con proveedor externo si el stack de auth lo habilita. Debe confirmar su email antes de operar plenamente.
- **RF-02 — Inicio de sesión:** el usuario puede iniciar sesión con sus credenciales y cerrar sesión. La sesión persiste entre visitas de forma segura.
- **RF-03 — Recuperación de contraseña:** el usuario puede solicitar restablecimiento de contraseña vía email.
- **RF-04 — Tipo de cuenta:** al registrarse o editar su perfil, el usuario selecciona su rol: comprador, vendedor o ambos.
- **RF-05 — Perfil de usuario:** el usuario puede editar su perfil: nombre, ubicación (provincia, departamento), teléfono de contacto, descripción breve y avatar.
- **RF-06 — Perfil visible:** el perfil del vendedor es visible para compradores desde el detalle de publicación (nombre, ubicación, tiempo en la plataforma).

### Publicaciones

- **RF-07 — Crear publicación:** un usuario logueado con rol vendedor puede crear una publicación con título, descripción, categoría, subcategoría, condición (nuevo/usado), precio, moneda, ubicación y hasta 6 imágenes.
- **RF-08 — Editar publicación:** el vendedor puede editar sus publicaciones activas.
- **RF-09 — Eliminar publicación:** el vendedor puede eliminar (soft delete) sus publicaciones.
- **RF-10 — Gestionar publicaciones propias:** el vendedor tiene un panel para ver sus publicaciones activas, pausadas y vendidas.
- **RF-11 — Estado de publicación:** cada publicación tiene un estado (activa, pausada, vendida, rechazada, eliminada). El vendedor puede marcarla como vendida.
- **RF-12 — Categorías del dominio:** las publicaciones se clasifican en: Maquinaria agrícola, Herramientas y equipos, Insumos, Hacienda y ganado, Repuestos, Servicios rurales. Cada categoría con subcategorías.
- **RF-13 — Moderación básica:** los usuarios pueden reportar una publicación. Un administrador puede pausar o eliminar publicaciones que violen las normas.

### Búsqueda y descubrimiento

- **RF-14 — Búsqueda por texto:** el usuario puede buscar publicaciones por palabras clave (título y descripción).
- **RF-15 — Filtros combinables:** la búsqueda se filtra por categoría, subcategoría, ubicación (provincia, departamento), rango de precio y condición. Los filtros se combinan entre sí.
- **RF-16 — Listado y paginación:** los resultados se muestran paginados u ordenados por relevancia o por fecha.
- **RF-17 — Detalle de publicación:** la publicación muestra todas sus imágenes, datos completos, ubicación y botón de contacto con el vendedor.
- **RF-18 — Favoritos:** un usuario logueado puede guardar y desguardar publicaciones en favoritos, y consultar su lista de favoritos.

### Contacto comprador-vendedor

- **RF-19 — Contacto al vendedor:** el comprador puede iniciar contacto con el vendedor desde el detalle de la publicación (mensaje vía plataforma y/o redirección a WhatsApp/email). Los datos de contacto personales del vendedor no se exponen públicamente sin su consentimiento.
- **RF-20 — Notificaciones básicas:** el usuario recibe notificaciones de contacto recibido (vendedor) y de seguimiento de favorito (comprador), dentro de la plataforma y por email.

## 3. Requisitos no funcionales

### Rendimiento

- **RNF-01 — Tiempo de respuesta:** las páginas de listado y detalle responden en menos de 1.5 s en conexiones típicas de 4G; el objetivo es p90 menor a 2 s.
- **RNF-02 — Carga de imágenes:** las imágenes se sirven optimizadas (WebP/AVIF, dimensiones adecuadas) desde CDN (Cloudinary); no se sirven archivos originales al navegador.
- **RNF-03 — Base de datos:** las consultas de listado y búsqueda usan índices adecuados y se monitorean; se evitan N+1 en Prisma.

### Seguridad

- **RNF-04 — Autenticación segura:** contraseñas con hash fuerte, sesiones httpOnly/secure, protección CSRF y manejo de secrets por variables de entorno.
- **RNF-05 — Validación y sanitización:** toda entrada de usuario se valida en servidor (schemas con Zod) y se sanitiza el HTML; nunca se confía en la validación de cliente.
- **RNF-06 — Autorización por rol:** las rutas de administración y moderación exigen rol admin; los usuarios solo pueden modificar sus propios recursos.
- **RNF-07 — Rate limiting:** las rutas de autenticación, contacto y creación de publicaciones tienen límites de peticiones por IP/usuario para mitigar abuso.
- **RNF-08 — Protección de datos personales:** los datos de contacto se tratan como sensibles; no se exponen en la API salvo lo estrictamente necesario.

### Móvil y conectividad

- **RNF-09 — Responsive móvil:** la experiencia completa (navegación, búsqueda, publicación, contacto) es usable en pantallas de 360 px y superiores; el móvil es el dispositivo principal del público objetivo.
- **RNF-10 — Conectividad limitada:** las páginas son livianas, con carga diferida de imágenes y tolerancia a conexiones lentas; el core (búsqueda y detalle) no depende de assets pesados.

### Accesibilidad y SEO

- **RNF-11 — Accesibilidad:** cumplimiento de WCAG 2.1 nivel AA en los flujos principales (contraste, foco visible, etiquetas de formularios, semántica).
- **RNF-12 — SEO:** las publicaciones y categorías tienen metadatos, Open Graph y URLs limpias e indexables por buscadores.

### Operación

- **RNF-13 — Disponibilidad:** objetivo de 99.5 % de disponibilidad en el stack Vercel + Supabase.
- **RNF-14 — Logging y observabilidad:** logs estructurados y monitoreo de errores desde el día 1 (p. ej. Sentry).

## 4. User stories principales

| ID | Como… | Quiero… | Para poder… |
| --- | --- | --- | --- |
| US-01 | productor | registrarme y crear un perfil de vendedor | publicar mi tractor usado |
| US-02 | vendedor | publicar con fotos, precio y ubicación | que compradores de mi zona lo encuentren |
| US-03 | comprador | buscar por categoría, ubicación y precio | encontrar maquinaria cerca de mi campo |
| US-04 | comprador | ver el detalle completo de una publicación | decidir si me interesa contactar |
| US-05 | comprador | contactar al vendedor directamente | negociar el precio sin intermediarios |
| US-06 | vendedor | recibir aviso cuando alguien me contacta | responder rápido y no perder la venta |
| US-07 | comprador | guardar publicaciones en favoritos | comparar opciones antes de decidir |
| US-08 | usuario | reportar una publicación inapropiada | mantener la plataforma confiable |
| US-09 | administrador | pausar o eliminar publicaciones que violan normas | moderar el contenido |
| US-10 | vendedor | marcar mi publicación como vendida | no recibir más contactos por algo vendido |

## 5. Criterios de aceptación de alto nivel

**Criterio transversal (exit definition del MVP):** un usuario nuevo puede, desde su celular y sin asistencia, registrarse, publicar un bien rural con fotos y ubicación, y otro usuario puede encontrarlo por búsqueda, verlo y contactar al vendedor. Todo el flujo funciona en producción sin datos de pago.

- **CA-01 (Registro):** con un email y contraseña válidos, el usuario queda registrado y puede iniciar sesión tras confirmar su email.
- **CA-02 (Publicación):** con datos mínimos completos (título, categoría, precio, ubicación, al menos una imagen), la publicación se crea y aparece en la búsqueda de inmediato.
- **CA-03 (Búsqueda):** combinando categoría + ubicación + rango de precio + condición, la búsqueda devuelve solo resultados que cumplen todos los filtros.
- **CA-04 (Detalle):** el detalle muestra todas las imágenes, datos, ubicación y un medio de contacto funcional.
- **CA-05 (Contacto):** al contactar, el vendedor recibe la notificación y el comprador recibe confirmación; los datos de contacto no se filtran a terceros.
- **CA-06 (Favoritos):** un favorito guardado persiste y aparece en la lista de favoritos del usuario.
- **CA-07 (Moderación):** una publicación reportada y rechazada por el administrador deja de ser visible para el resto de los usuarios.
- **CA-08 (Responsive):** todos los flujos de CA-01 a CA-07 funcionan en un navegador móvil de 360 px con conexión 4G.
