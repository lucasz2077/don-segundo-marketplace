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
| Escrow / custodia de fondos | Fuera de alcance: los pagos se procesan vía pasarela externa (Mercado Pago) desde la Fase 3, Slice 3 (RF-39..RF-51); la plataforma no custodia fondos. |
| Logística / envíos / fletes integrados | Fase posterior. La ubicación y el contacto directo cubren la necesidad inicial. |
| Ratings y reseñas | Fase posterior (Fase 3). Requiere una masa crítica de transacciones para ser útil. |
| Chat en tiempo real | El MVP usa mensajes asincrónicos o redirección al contacto (WhatsApp / teléfono / email). La Fase 2 implementa chat con polling eficiente, sin websockets. |
| Verificación de vendedores / identidad | Fase posterior (Fase 3). |
| Planes premium / publicidad pagada | Fase posterior (Fase 4). |
| App móvil nativa | Fase posterior (Fase 4). El MVP es web responsive. |
| Pasarela de pagos con custodia / pagos propios | No se procesa dinero en las Fases 1-2. Desde la Fase 3, Slice 3 el cobro es vía Mercado Pago Checkout Pro (RF-40), sin tarjetas en nuestro servidor. |

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
- **RF-21 — Bandeja de mensajes:** el usuario tiene una bandeja con sus conversaciones por publicación, ordenadas por última actividad, separadas por su rol (comprador o vendedor) en cada hilo. Las conversaciones no leídas se distinguen visualmente y se marcan al abrirse.
- **RF-22 — Chat con mensajes en tiempo real (polling):** dentro de una conversación abierta, los mensajes nuevos se muestran sin recargar la página, mediante polling eficiente por cursor. El envío es optimista y no se pierde mensajes por errores de red; los mensajes propios y ajenos se distinguen claramente.
- **RF-23 — Notificaciones ampliadas:** el usuario recibe notificaciones de mensaje nuevo, de cambios en publicaciones que sigue (favoritos: precio o estado) y de cambios de estado en sus propias publicaciones, dentro de la plataforma y por email.
- **RF-24 — Perfil público del vendedor:** el perfil público de un vendedor muestra bio, nombre comercial, tiempo en la plataforma, tiempo de respuesta típico y sus publicaciones activas. Es accesible desde el detalle de publicación y desde el chat. Además, si el vendedor tiene al menos 3 calificaciones (`ratingCount ≥ 3`), el perfil muestra su calificación: estrellas, promedio y cantidad de reseñas; con menos de 3 muestras o sin reseñas, el bloque de rating no se muestra.
- **RF-25 — Moderación con flujo de resolución:** cada reporte recorre un flujo de resolución trazable (abierto → en revisión → resuelto/descartado, con estados terminales inmutables), y cada acción administrativa (cambio de estado, pausar o rechazar la publicación) queda registrada en `ModerationAction` con autor y fecha, vinculada al reporte origen. El flujo es estricto: pausar/rechazar la publicación solo está disponible una vez que el reporte está en revisión. Además, para frenar el spam, cada usuario puede crear hasta 5 reportes por día (respuesta 429 `REPORT_LIMIT_EXCEEDED` al superar el límite).

### Compras y calificaciones

- **RF-26 — Registro de orden de compra y pago (modificado en Fase 3, Slice 3):** al iniciar una compra sobre una publicación activa con stock, el sistema crea un registro `Compra` con estado `PENDIENTE` y `external_reference` (comprador, publicación, precio unitario, moneda, cantidad 1, fecha) y una preferencia de pago server-side. El decremento atómico de stock y el paso a `SOLD` se ejecutan SOLO cuando el pago es aprobado (webhook verificado e idempotente, RF-43..RF-45), en la misma `$transaction` con el patrón `updateMany` condicionado (`stock > 0`). El endpoint `POST /api/listings/[id]/comprar` devuelve en `{data}` la orden y el `init_point` del checkout (ya NO devuelve `compraId` de compra completada).
- **RF-27 — Calificación de venta:** solo el comprador de una `Compra` puede calificar la venta, una sola vez por compra, únicamente si la compra tiene pago APROBADO (RF-39..RF-45; compras PENDIENTES, FALLIDAS, REEMBOLSADAS o EXPIRADAS no son calificables) y dentro de los 30 días posteriores a la aprobación del pago (`aprobadoAt`, no `createdAt`). La calificación usa un puntaje entero de 1 a 5 y un comentario opcional de hasta 500 caracteres. Al calificar, el sistema recalcula de forma atómica el promedio y la cantidad de calificaciones del vendedor (`ratingAvg`/`ratingCount`) y notifica al vendedor, sin que un fallo de notificación revierta la calificación. La reseña queda visible en el detalle de la publicación vendida (ver RF-30).
- **RF-28 — API de calificaciones tipada:** el endpoint `POST /api/ratings` exige sesión, valida el cuerpo con Zod (`compraId` uuid, `puntaje` entero 1-5, `comentario` opcional de hasta 500 caracteres) y responde errores tipados: 401 `NO_AUTENTICADO`, 404 `COMPRA_NO_ENCONTRADA`, 403 `SIN_PERMISO`, 409 `YA_CALIFICADA` o `COMPRA_NO_APROBADA`, 410 `VENTANA_EXPIRADA`, 422 `VALIDACION` y 500 `ERROR_INTERNO`.
- **RF-29 — "Mis compras" y formulario de reseña:** la página `/compras` (solo con sesión; sin sesión redirige a login) lista las compras del usuario autenticado y muestra el botón "Calificar" únicamente para compras con pago APROBADO, dentro de la ventana de 30 días desde `aprobadoAt` y sin calificación previa. El formulario usa estrellas accesibles (teclado y etiquetas), valida en servidor vía RF-28 y cubre los estados de carga, error, éxito y vacío. La interfaz está en español y es responsive.
- **RF-30 — Reseñas visibles en el detalle de la publicación:** el detalle de una publicación (`/listados/[id]`) muestra, debajo del contenido principal, las reseñas de las ventas de **esa** publicación: autor (nombre del comprador), puntaje en estrellas, comentario y fecha. El bloque se muestra aunque haya una sola reseña (no aplica el umbral de 3 muestras del perfil público, que es un agregado de vendedor). Si la publicación no tiene reseñas, el bloque no se muestra.
- **RF-31 — Eliminación de reseña propia:** el autor de una reseña (el comprador de la `Compra`) puede eliminar su propia reseña desde el detalle de la publicación, con confirmación en la interfaz. Al eliminar, el sistema recalcula de forma atómica e inversa `ratingAvg`/`ratingCount` del vendedor (promedio ponderado inverso, sin caer por debajo de 0) en la misma transacción que borra el registro. La eliminación no está limitada por la ventana de 30 días (esa ventana restringe solo la creación). Si la reseña eliminada era la única muestra, `ratingCount` vuelve a 0 y el bloque agregado del perfil público deja de mostrarse.

### Verificación de vendedores

- **RF-32 — Solicitud de verificación self-service:** un usuario con rol vendedor o ambos (`accountType` SELLER/BOTH) puede solicitar su verificación desde su perfil. La solicitud es voluntaria (nunca obligatoria) y requiere adjuntar la documentación de identidad y, opcionalmente, de domicilio. No puede existir más de una solicitud pendiente a la vez: si el vendedor ya tiene una solicitud `PENDING`, al volver a solicitarla ve el estado de esa solicitud en lugar de crear otra.
- **RF-33 — Revisión por administrador:** el panel admin (`/admin/...`) lista las solicitudes de verificación con su estado y las fechas. El admin puede **aprobar** o **rechazar** una solicitud; al rechazar, debe indicar un motivo. Aprobar una solicitud setea el perfil del vendedor a `VERIFIED` (badge visible); rechazarla lo deja en `REJECTED` con motivo, permitiendo un nuevo intento. El flujo es estricto: solo un admin puede revisar, y la aprobación/rechazo queda registrada con autor y fecha en la solicitud.
- **RF-34 — Badge de vendedor verificado:** un vendedor con estado `VERIFIED` muestra un badge "Verificado" (sello) en su perfil público (`/vendedores/[id]`) y en el detalle de sus publicaciones (`/listados/[id]`). El sello no expone la documentación ni los datos de la solicitud: solo confirma que el vendedor fue verificado.
- **RF-35 — Reintento tras rechazo:** si la solicitud fue rechazada, el vendedor puede volver a solicitarla (nueva solicitud con su documentación). Las solicitudes previas quedan en el historial (append-only) con su estado, motivo y autor, de modo que el admin ve la historia del vendedor.
- **RF-36 — Mis datos y estado de verificación:** en su perfil, el vendedor ve el estado actual de su verificación (no solicitado / pendiente / verificado / rechazado con motivo) y, si aplica, el botón para solicitar o re-solicitar la verificación.

### Pagos y checkout (Fase 3, Slice 3)

- **RF-39 — Orden de pago pendiente:** al iniciar una compra sobre una publicación ACTIVE con stock ≥ 1 y comprador autenticado distinto del dueño, el sistema crea un registro `Compra` con estado `PENDIENTE` y `external_reference` única, SIN decrementar stock ni cambiar el estado de la publicación. Se conservan los errores de dominio tipados existentes (409 `SIN_STOCK`, 403 `SIN_PERMISO`, 404 `NO_ENCONTRADA`, 422).
- **RF-40 — Checkout Pro server-side con redirect:** el sistema crea la preferencia de pago en el servidor usando `MP_ACCESS_TOKEN`, con `external_reference` (id de la Compra), `back_urls` (success/failure/pending) derivadas de `APP_URL`, `marketplace_fee` del 5% y `auto_return`. El pago se completa FUERA de la plataforma (redirect a `init_point`); el servidor NO procesa datos de tarjeta. Los montos se convierten de `Decimal(12,2)` a la unidad de MP de forma exacta, sin float, con la moneda consistente entre listing, Compra y pago.
- **RF-41 — Resultado del pago y estados visibles:** el usuario puede ver el estado de su compra en `/compras` (PENDIENTE/APROBADO/FALLIDO/REEMBOLSADO) y el sistema muestra páginas de resultado al volver por `back_urls` (éxito, fallo, pendiente) en español. Un pago fallido o abandonado NO modifica stock ni estado de la publicación.
- **RF-42 — Toda publicación con stock es comprable:** el sistema ofrece el botón de pago para TODA publicación activa con stock ≥ 1 y distinta del dueño, sin excepción por categoría (incluidas maquinaria agrícola, hacienda/ganado y servicios rurales). El canal de contacto con el vendedor (RF-19) se mantiene como complemento opcional, pero NINGUNA publicación transacciona sin pago por la plataforma (reversión del sponsor 2026-08-15: se elimina el concepto "solo-contacto/sin pago").
- **RF-43 — Recepción y verificación server-side del webhook:** el endpoint `POST /api/pagos/webhook` no confía en el payload crudo: autentica/verifica la notificación (secreto/firma `MP_WEBHOOK_SECRET`) y confirma el estado del pago con el SDK server-side (`Payment.get`) antes de cualquier efecto. Solo un pago `approved` dispara el procesamiento (RF-45).
- **RF-44 — Procesamiento idempotente:** el sistema procesa cada aprobación exactamente una vez por `external_reference`/pago: notificaciones duplicadas o reintentos de MP son no-op (sin doble decremento ni doble estado).
- **RF-45 — Aprobación: decremento atómico + SOLD + notificaciones:** al confirmar un pago `approved`, el sistema ejecuta el decremento con el patrón atómico de la compra directa (`updateMany` condicionado `stock > 0` dentro de `$transaction`): decrementa 1, `soldCount + 1`, marca la Compra `APROBADO` y, si el stock llega a 0, pasa la publicación a `SOLD` en la misma tx. Las notificaciones de venta paga al vendedor son best-effort post-commit: un fallo de notificación NO revierte la aprobación.
- **RF-46 — Rechazo por monto distinto:** el sistema NO aprueba un pago cuyo monto (o moneda) pagado difiera del precio esperado de la Compra; registra la inconsistencia y NO aplica decremento ni SOLD.
- **RF-47 — OAuth MP obligatorio para publicar:** el sistema exige cuenta de Mercado Pago vinculada (OAuth) al vendedor para publicar CUALQUIER tipo de publicación: sin vinculación válida, el alta/edición de publicaciones se rechaza (403 `MP_NO_VINCULADA`).
- **RF-48 — Flujo OAuth de vinculación:** el sistema provee un flujo OAuth (iniciar, redirect a MP con `MP_CLIENT_ID`/`MP_CLIENT_SECRET`, callback con `APP_URL`) que persiste el access token y la identificación de la cuenta MP del vendedor (server-side, nunca en el cliente ni en logs). El token puede re-vincularse si caduca o se revoca.
- **RF-49 — Devolución MVP mediada por vendedor:** el sistema permite el reembolso completo de una Compra APROBADA mediado por el vendedor: el comprador solicita, el vendedor aprueba o rechaza; al aprobarse, el sistema ejecuta el reembolso vía API de MP y marca la Compra `REEMBOLSADO`.
- **RF-50 — Ventana de devolución:** el sistema acepta solicitudes de devolución solo dentro de los 7 días posteriores al pago aprobado (`aprobadoAt`) y solo si la compra está APROBADA (pre-retiro). Fuera de ventana, post-retiro o sobre compras no APROBADAS se rechaza (410 `VENTANA_EXPIRADA` / 409). La barrera pre-retiro vigente es la ventana temporal de 7 días desde `aprobadoAt` (el MVP no modela estado de retiro; caveat W1 del verify).
- **RF-51 — Absorción de fees en el reembolso:** en todo reembolso, el comprador recibe el 100% del monto pagado y el vendedor absorbe `marketplace_fee` (5%) y los costos del gateway (no recupera la comisión).

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
- **RNF-15 — Confidencialidad de la documentación de verificación:** los documentos adjuntos en una solicitud de verificación (identidad/domicilio) son datos sensibles: solo el administrador puede verlos en el panel de revisión; nunca se exponen en la API pública, en el perfil público, en el detalle de publicaciones ni en la propia UI del vendedor.
- **RNF-16 — Integridad del webhook:** el sistema verifica toda notificación de pago server-side (firma/secreto `MP_WEBHOOK_SECRET` + confirmación con `Payment.get`); nunca confía en el payload crudo del webhook.
- **RNF-17 — Idempotencia:** el procesamiento de pagos es idempotente por `external_reference`/pago: duplicados y reintentos de MP no producen efectos duplicados (estado atómico y `mpPaymentId` único).
- **RNF-18 — Concurrencia de stock:** todo decremento de stock al aprobar un pago usa el patrón atómico condicionado (`updateMany` con `stock > 0`) dentro de `$transaction`: ante pagos concurrentes por la última unidad, solo uno decrementa.
- **RNF-19 — Montos y moneda:** todos los montos se manejan como `Decimal` (Prisma `Decimal(12,2)`) en servidor; la conversión a la unidad de MP es exacta, sin float; la moneda es consistente entre listing, Compra y pago.
- **RNF-20 — Secretos MP:** `MP_ACCESS_TOKEN`, `MP_CLIENT_ID`, `MP_CLIENT_SECRET` y `MP_WEBHOOK_SECRET` existen solo server-side (variables de entorno), jamás en el cliente, logs ni repo; `NEXT_PUBLIC_*` solo para claves públicas si hacen falta.

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
| US-11 | comprador | chatear con el vendedor dentro de la plataforma | cerrar el trato sin depender de canales externos |
| US-12 | vendedor | ver mis conversaciones agrupadas por publicación y saber cuáles no leí | responder rápido y no perder oportunidades |
| US-13 | comprador | ver el perfil público del vendedor antes de contactar | evaluar su confiabilidad |
| US-14 | usuario | recibir aviso cuando cambia el precio de un favorito | decidir si comprar ahora o esperar |
| US-15 | administrador | resolver reportes con un flujo claro y auditable | mantener la plataforma confiable |

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
