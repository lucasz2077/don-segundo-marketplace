# Roadmap — marketplace-campo

Este roadmap organiza el trabajo en fases alineadas con el flujo de trabajo del proyecto (ver `docs/AGENTS.md`): comprender el negocio, definir el MVP, diseñar la arquitectura, diseñar el modelo de datos, dividir en tareas pequeñas, implementar, revisar y testear. Cada fase sigue ese orden internamente y tiene un criterio de salida explícito antes de pasar a la siguiente.

## Principio de fases

- **Dependencia estricta entre fases:** cada fase se completa (criterio de salida cumplido) antes de iniciar la siguiente.
- **Priorización interna:** cada fase lista entregables en orden de valor para el usuario; se puede recortar el alcance de una fase pero no saltarse una fase entera.
- **Trabajo por tareas pequeñas:** dentro de cada fase, el trabajo se divide en tickets pequeños (definición de hecho, revisión y tests por ticket), según el principio 5 del AGENTS.md.
- **Documentos vivos:** `vision.md`, `requirements.md`, `architecture.md` y `database.md` se actualizan cuando una fase introduce cambios (nunca se implementa algo que no esté reflejado en la documentación).

## Fase 0 — Fundación

### Objetivos
Preparar el terreno técnico y de proceso para construir el MVP con calidad: repositorio, tooling, stack base, base de datos conectada y CI funcionando.

### Entregables principales
- Repositorio inicializado con Git y convención de commits convencionales.
- Proyecto Next.js (App Router) + TypeScript + Tailwind CSS configurados.
- Prisma conectado a PostgreSQL (Supabase) con `prisma migrate` funcionando en local, staging y producción.
- Esquema base versionado (seed de categorías y subcategorías del dominio).
- Variables de entorno documentadas (`.env.example`) y secrets gestionados.
- CI/CD: lint, typecheck, tests y `prisma migrate deploy` en cada push a la rama principal.
- Convenciones del equipo documentadas (estructura de carpetas, patrón de rutas y servicios).
- Sentry y observabilidad básica configurados.

### Criterio de salida
Un desarrollador nuevo puede clonar el repo, levantar el proyecto con un solo comando, conectarse a una base vacía y correr el pipeline de CI en verde.

### Riesgos
- Configuración inicial de auth sobrecargada; se contiene con una capa mínima (solo registrar login/logout de prueba).
- Mismatch de versiones entre Next.js y la librería de auth; se fija la decisión de auth (Better Auth) y se documenta la versión pinneada.

## Fase 1 — MVP

### Objetivos
Lanzar en producción el flujo central del negocio: un productor publica un bien rural con fotos y ubicación, y otro usuario lo encuentra, lo ve y contacta al vendedor. Sin pagos, sin logística, sin chat en tiempo real.

### Entregables principales
- Autenticación completa con Better Auth: registro, login, confirmación de email, recuperación de contraseña, sesión persistente.
- Perfiles básicos con tipo de cuenta (comprador/vendedor/ambos) y edición.
- Categorías y subcategorías del dominio con seed y navegación.
- CRUD de publicaciones (crear, editar, eliminar/soft delete, marcar vendida) con subida de imágenes a Cloudinary.
- Búsqueda con filtros combinables: categoría, ubicación, rango de precio y condición.
- Detalle de publicación con galería de imágenes y datos del vendedor.
- Contacto comprador-vendedor (mensaje inicial vía plataforma y/o redirección a WhatsApp/email) con notificación al vendedor.
- Favoritos (guardar/desguardar y listado).
- Moderación básica: reportes de usuarios y panel admin para pausar/eliminar publicaciones.
- Notificaciones básicas en plataforma y por email.
- Analítica mínima de métricas de alto nivel (MAU, publicaciones activas, contactos).
- Deploy en producción (Vercel + Supabase + Cloudinary) con dominio propio.

### Criterio de salida
Todos los criterios de aceptación de `requirements.md` (CA-01 a CA-08) pasan en producción: el flujo completo registro → publicar → buscar → detalle → contactar funciona en móvil, y las métricas de alto nivel se registran correctamente.

### Riesgos
- Calidad de las publicaciones iniciales baja (fotos y datos incompletos): se mitiga con formulario guiado y validación mínima de campos.
- Búsqueda lenta por falta de datos de prueba: se siembra data sintética realista y se perfila con EXPLAIN.
- Conectividad irregular del público objetivo: se prioriza el peso de página y la carga diferida de imágenes.
- Zona de prueba: se lanza piloto en una provincia/departamento antes de escalar a todo el país.

## Fase 2 — Comunidad

### Objetivos
Transformar el marketplace de un catálogo en una comunidad con interacción: mensajería, notificaciones y perfiles que generen confianza entre pares.

### Entregables principales

Trabajo por slices con dependencia estricta (cada slice se completa antes del siguiente):

- **Slice 1 — Bandeja de mensajes y estados de lectura:** bandeja de conversaciones por publicación ordenada por `lastMessageAt` (los índices `[buyerId, lastMessageAt]` y `[sellerId, lastMessageAt]` ya existen); vista separada comprador/vendedor según el rol en cada hilo; marcado de leído con `Message.readAt` al abrir el hilo; contador de no leídos en la navegación.
- **Slice 2 — Chat en tiempo real con polling eficiente:** polling por cursor (`after: createdAt`) cada 3-5 s solo mientras la conversación está abierta; envío optimista con dedupe por idempotencia; auto-scroll y badge de mensaje nuevo si la pestaña no está enfocada; rate limiting en el envío (RNF-07). Decisión tomada: polling, sin websockets (costo de websockets en serverless no se justifica en esta fase).
- **Slice 3 — Notificaciones ampliadas:** modelo `Notification` nuevo (user, tipo, payload JSONB, leída) con migración no destructiva; eventos de mensaje nuevo, seguimiento de favorito (cambio de precio/estado) y cambio de estado de publicación propia; entrega en plataforma y por email.
- **Slice 4 — Perfiles públicos enriquecidos:** extensión de `Profile` con datos públicos (tiempo de respuesta típico, en plataforma desde); página pública del vendedor con bio, businessName, publicaciones activas y contacto autorizado; enlaces desde el detalle de publicación y el chat.
- **Slice 5 — Moderación mejorada:** flujo de resolución de reportes usando el enum `ReportStatus` existente (OPEN → REVIEWED → RESOLVED/DISMISSED); tabla `ModerationAction` de auditoría (quién, cuándo, qué acción); panel admin con filtros por estado/motivo y detalle del reporte. **COMPLETADO** (Fase 2) — implementado y documentado en `requirements.md` RF-25 y `database.md` §7; límite anti-spam de 5 reportes/día/usuario incluido.
- **Slice 6 — Búsqueda por distancia: DIFERIDO.** No entra en la Fase 2; queda como slice condicional futuro si se valida la necesidad (geolocalización con PostGIS, ya contemplada en `database.md` §5).

### Criterio de salida
La mensajería es el canal principal de contacto (más del 50 % de los contactos se inician en plataforma), y la tasa de respuesta del vendedor en 24 h supera el objetivo definido en `vision.md`.

### Riesgos
- Abuso del chat (spam): rate limiting y bloqueo de usuarios.
- Costo operativo de websockets en serverless: se evalúa polling eficiente o servicio dedicado.
- Moderación que no escala con el contenido generado por usuarios: se refuerza el panel y se automatizan reglas simples.

## Fase 3 — Confianza y transacción

### Objetivos
Dar seguridad a las transacciones: reputación, verificación de vendedores y, cuando el negocio lo justifique, procesamiento de pagos. Esto habilita la monetización.

### Entregables principales

Trabajo por slices con dependencia estricta (cada slice se completa antes del siguiente):

- **Slice 1 — Ratings y reseñas comprador → vendedor:** registro transaccional de compras (`Compra` en la misma transacción que el decremento de stock, con `compraId` en el contrato de compra), calificación del comprador al vendedor (`Rating`: una por compra, ventana de 30 días, puntaje 1-5 y comentario opcional) con recálculo atómico de `ratingAvg`/`ratingCount`, API `POST /api/ratings` tipada con Zod, página "Mis compras" con formulario de reseña, y agregados de rating en el perfil público solo con 3 o más muestras. Además, las reseñas son visibles en el detalle de la publicación vendida (debajo del contenido) y el autor puede eliminar su propia reseña con recálculo inverso atómico. **COMPLETADO** (Fase 3) — implementado y documentado en `requirements.md` RF-26..RF-31 y RF-24 (modificado) y `database.md` §7; el modelo `Compra` queda como prerequisito del checkout.
- **Slice 2 — Verificación de vendedores:** verificación de identidad/domicilio con estado visible en publicaciones y perfiles (el campo `Profile.sellerVerified` ya existe en el esquema; pasa de boolean a `VerificationStatus` y se agrega el modelo `SolicitudVerificacion` para el flujo self-service + admin). **EN PROGRESO** — requisitos RF-32..RF-36 y RNF-15 documentados en `requirements.md`, modelo en `database.md`.
- **Slice 3 — Términos de servicio y políticas de uso** actualizados para transacciones. Pendiente.
- **Slice 4 — Reputación aplicada a la búsqueda:** vendedores verificados destacados y señales de rating (se apoya en el Slice 1, ya implementado). Pendiente.

#### Pagos y checkout

- **Datos del comprador completos:** el checkout requiere dirección de entrega y medio de pago. Se reutiliza el modelo `Direccion` existente (calle, ciudad, provincia, código postal, piso/depto opcional, referencia opcional) y se agrega la selección o alta de una dirección durante el flujo si el comprador no tiene ninguna cargada o prefiere una nueva. Se decide en esta fase qué campos del usuario son obligatorios en el checkout (p. ej. teléfono de contacto, ya existente en `User`).
- **Medios de pago y opciones por medio:** cada medio define sus propias opciones:
  - **Mercado Pago:** pago con saldo de cuenta, redirección al flujo MP para pago con QR/link, o integración vía API (preferencia de pago). Permite débito/crédito sin guardar datos sensibles.
  - **Tarjeta de débito:** procesada vía pasarela (Mercado Pago u otra) mediante tokenización; no se almacenan datos de tarjeta en la propia base.
  - **Tarjeta de crédito:** procesada vía pasarela, con opción de pago en cuotas según lo que ofrezca el medio; misma política de tokenización.
  - **Otros medios futuros:** transferencia bancaria (con datos de cuenta a mostrar) y efectivo/pago contra entrega (sin procesamiento; el vendedor confirma el cobro) — marcados como opcionales en esta fase.
- **Flujo de checkout:** publicación → dirección → medio de pago y opciones → confirmación → registro de la compra (decremento de stock y transición a `SOLD` ya implementados en Fase 2) → notificación de venta al vendedor y de confirmación al comprador → estado de la transacción visible en "Mis publicaciones".
- Criterio de aceptación: una compra de prueba completa con cada medio habilitado crea el registro esperado, actualiza stock/estado y notifica a ambas partes sin almacenar datos de pago sensibles.

### Criterio de salida
Un porcentaje objetivo (definido con datos de la Fase 2) de transacciones se cierra con rating registrado, y el sistema de pagos, si se implementa, pasa una revisión de seguridad y cumplimiento antes de activarse.

### Riesgos
- Rating sin masa crítica genera decisiones sesgadas: se define un mínimo de transacciones antes de mostrar agregados.
- Pagos/escrow agregan complejidad legal y operativa (AFIP, facturación, fraudes): se externaliza la pasarela y se contiene el alcance.
- Fricción de la verificación de vendedores que espanta usuarios: se hace voluntaria y beneficiosa (badge), no obligatoria.

## Fase 4 — Escala

### Objetivos
Monetizar, diversificar el catálogo y escalar la infraestructura según la demanda: servicios rurales como primera clase, planes premium y decisión de app móvil/VPS con datos reales.

### Entregables principales
- Servicios rurales como categoría de primera clase (fletes, siembra, veterinarios, alquiler de maquinaria) con campos específicos.
- Planes premium y publicaciones destacadas (monetización sin comisión obligatoria).
- Evaluación y, si se decide, app móvil nativa o PWA avanzada.
- Migración de infraestructura si el costo/rendimiento lo exige: VPS con contenedores y/o backend dedicado (ver `architecture.md`, sección de deploy).
- Expansión geográfica a otras provincias con soporte multi-provincia.
- Escalado de búsqueda y caché (p. ej. búsqueda dedicada) según volumen.

### Criterio de salida
El modelo de ingresos (premium/destacados) cubre los costos de infraestructura, y las métricas de salud del marketplace (definidas en `vision.md`) se mantienen estables con crecimiento de MAU.

### Riesgos
- Monetizar demasiado pronto daña la adopción: se prioriza el valor para el usuario antes que el ingreso.
- App móvil nativa es costosa sin datos que lo justifiquen: se decide en base a métricas de uso móvil y retención.
- Crecimiento de costos de infraestructura: la migración a VPS/backend dedicado se ejecuta solo con demanda demostrada.

## Priorización y dependencias

```
Fase 0 ──▶ Fase 1 ──▶ Fase 2 ──▶ Fase 3 ──▶ Fase 4
Fundación   MVP       Comunidad  Confianza   Escala
```

- **Fase 0 → Fase 1:** estricta. No se implementa el MVP sin CI y base de datos gestionada.
- **Fase 1 → Fase 2:** la mensajería y los perfiles requieren que existan publicaciones y contacto básico.
- **Fase 2 → Fase 3:** los ratings necesitan interacción real previa (masa crítica de contactos).
- **Fase 3 → Fase 4:** la monetización y la escala requieren confianza y volumen sostenido.
- **Dependencias técnicas específicas:** la tabla de conversaciones/mensajes se diseña en la Fase 1 (esquema) para que la Fase 2 no requiera migraciones destructivas; la geolocalización se guarda desde el MVP para habilitar búsqueda por distancia sin remodelar el esquema.

## Contenido de cada fase (estructura estándar)

Cada fase al planificarse se completa con:
- **Objetivos:** qué valor de negocio se busca.
- **Entregables principales:** tickets pequeños con definición de hecho.
- **Criterio de salida:** evidencia verificable de que la fase terminó.
- **Riesgos:** principales amenazas y su mitigación.
- **Actualización de documentación:** cambios en `vision.md`, `requirements.md`, `architecture.md` o `database.md` que la fase introduce.
