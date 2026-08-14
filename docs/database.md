# Modelo de datos — marketplace-campo

## 1. Modelo entidad-relación

Entidades principales y sus relaciones:

- **User** (1)—(N) **Listing**: un usuario vendedor publica muchas publicaciones.
- **User** (1)—(N) **Favorite**: un usuario guarda muchas publicaciones en favoritos.
- **User** (1)—(N) **ListingContact / Message**: un usuario participa en muchos contactos.
- **Category** (1)—(N) **Listing**: cada publicación pertenece a una categoría (jerárquica: categorías y subcategorías).
- **Listing** (1)—(N) **ListingImage**: una publicación tiene varias imágenes.
- **Listing** (1)—(N) **Report**: una publicación puede ser reportada varias veces.
- **User** (1)—(N) **Report**: un usuario puede hacer muchos reportes.
- **User** (1)—(N) **Compra**: un comprador registra muchas compras.
- **Listing** (1)—(N) **Compra**: una publicación puede ser comprada varias veces.
- **Compra** (1)—(0..1) **Rating**: una compra tiene a lo sumo una calificación (unique `compraId`).
- **User** (1)—(N) **Rating** (comprador) y **User** (1)—(N) **Rating** (vendedor): un usuario califica las ventas que compró y recibe calificaciones por sus ventas.
- **Conversation** (1)—(N) **Message**: un hilo de contacto contiene muchos mensajes. **Conversation** (N)—(N) **User** (participantes, resuelto con tabla pivote implícita).

```
User ──┬──< Listing >──< ListingImage
       │        │
       │        ├──< Favorite >── User (repetido como guardador)
       │        ├──< Report >── User (repetido como denunciante)
       │        ├──< Compra >──< Listing (repetido como comprado)
       │        │        └──< Rating (0..1 por compra) ──> User (vendedor)
       │        └──< Category (self-referencing)
       │
       └──< Conversation >──< Message
                │
                └──> User (comprador y vendedor como participantes)
```

## 2. Entidades y campos

### User
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| email | string | Único, usado para login |
| name | string | Nombre visible |
| passwordHash | string? | Null si usa solo proveedor OAuth |
| image | string? | Avatar (URL Cloudinary) |
| phone | string? | Contacto telefónico |
| role | enum | USER, ADMIN |
| accountType | enum | BUYER, SELLER, BOTH |
| locationLabel | string | "San Pedro, Buenos Aires" |
| province | string? | Código/nombre de provincia (índice) |
| createdAt / updatedAt | timestamps | |

### Profile
Se modela como extensión del User (perfil de vendedor público).
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK = userId (1:1 con User) |
| bio | text | Descripción breve |
| businessName | string? | Razón social / nombre comercial |
| sellerVerified | boolean | Fase 3 (verificación de vendedores) |
| ratingAvg | float | Promedio de calificaciones del vendedor (0-5) |
| ratingCount | int | Cantidad de calificaciones; el bloque de rating se muestra solo con ≥ 3 (RF-24) |
| createdAt / updatedAt | timestamps | |

### Category
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | string | PK slug (ej. `maquinaria-agricola`) |
| name | string | "Maquinaria agrícola" |
| parentId | string? | FK self-referencing para subcategorías |
| sortOrder | int | Orden de navegación |
| slug | string | Único, usado en URLs/SEO |

### Listing
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| ownerId | uuid | FK → User |
| categoryId | string | FK → Category |
| title | string | Índice de texto |
| description | text | Índice de texto |
| price | decimal | Decimal(12,2) |
| currency | enum | ARS (MVP); extensible a USD |
| condition | enum | NEW, USED, NEGOTIABLE como complemento |
| status | enum | ACTIVE, PAUSED, SOLD, REJECTED, DELETED |
| province | string | Índice para filtro por ubicación |
| city | string? | Localidad |
| latitude / longitude | float? | Geolocalización opcional |
| viewCount | int | Contador de vistas |
| publishedAt | timestamps | |
| deletedAt | timestamps? | Soft delete |

### ListingImage
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| listingId | uuid | FK → Listing |
| url | string | URL Cloudinary optimizada |
| publicId | string | ID del asset en Cloudinary (para borrado) |
| position | int | Orden de visualización |
| alt | string | Texto alternativo (accesibilidad/SEO) |

### Favorite
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid | FK → User |
| listingId | uuid | FK → Listing |
| createdAt | timestamps | |

### Conversation
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| listingId | uuid | FK → Listing (contexto del hilo) |
| buyerId | uuid | FK → User |
| sellerId | uuid | FK → User |
| lastMessageAt | timestamps? | Para ordenar bandejas |
| createdAt / updatedAt | timestamps | |

### Message
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| conversationId | uuid | FK → Conversation |
| senderId | uuid | FK → User |
| body | text | Contenido sanitizado |
| readAt | timestamps? | Soporte para notificaciones |
| createdAt | timestamps | |

### Report
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| reporterId | uuid | FK → User |
| listingId | uuid | FK → Listing |
| reason | enum | SPAM, INAPPROPRIATE, FRAUD, DUPLICATE, OTHER |
| details | text? | Comentario del denunciante |
| status | enum | OPEN, REVIEWED, RESOLVED, DISMISSED |
| createdAt / updatedAt | timestamps | |

### Compra
Registra cada compra de una publicación (RF-26), creada en la misma transacción que el decremento de stock.
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| compradorId | uuid | FK → User (onDelete Restrict) |
| listingId | uuid | FK → Listing (onDelete Restrict) |
| precioUnitario | decimal | Decimal(12,2), precio al momento de la compra |
| currency | enum | ARS, USD |
| cantidad | int | Default 1 (una publicación por compra) |
| rating | Rating? | 1:1 opcional (a lo sumo una calificación) |
| createdAt | timestamp | Fecha de la compra; inicia la ventana de 30 días para calificar |

Índices: `(compradorId, createdAt)` para "Mis compras"; `(listingId)` para las compras de una publicación.

### Rating
Calificación del comprador hacia el vendedor, una por compra (RF-27).
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| compradorId | uuid | FK → User (relación `RatingComprador`, onDelete Restrict) |
| vendedorId | uuid | FK → User (relación `RatingVendedor`, onDelete Restrict) |
| compraId | uuid | FK → Compra (onDelete Restrict), único: una calificación por compra |
| puntaje | int | 1 a 5 |
| comentario | string? | Opcional, máx. 500 caracteres; vacío se guarda como null |
| createdAt | timestamp | |

Índices: `compraId` único (unique) y `(vendedorId)` para las calificaciones recibidas de un vendedor.

Nota: los mensajes y la conversación completos se consolidan en la Fase 2 (chat). En el MVP el "contacto" puede persistirse como un registro simple de contacto (comprador, vendedor, publicación, mensaje inicial y canal), que luego migra sin romper el esquema hacia el modelo Conversación/Mensaje de la Fase 2.

## 3. Esquema Prisma

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

enum AccountType {
  BUYER
  SELLER
  BOTH
}

enum Currency {
  ARS
  USD
}

enum ListingCondition {
  NEW
  USED
}

enum ListingStatus {
  ACTIVE
  PAUSED
  SOLD
  REJECTED
  DELETED
}

enum ReportReason {
  SPAM
  INAPPROPRIATE
  FRAUD
  DUPLICATE
  OTHER
}

enum ReportStatus {
  OPEN
  REVIEWED
  RESOLVED
  DISMISSED
}

model User {
  id             String       @id @default(uuid())
  email          String       @unique
  name           String
  passwordHash   String?
  image          String?
  phone          String?
  role           Role         @default(USER)
  accountType    AccountType  @default(BOTH)
  locationLabel  String
  province       String?
  profile        Profile?
  listings       Listing[]
  favorites      Favorite[]
  reports        Report[]
  compras        Compra[]
  ratingsDados   Rating[] @relation("RatingComprador")
  ratingsRecibidos Rating[] @relation("RatingVendedor")
  buyerConvs     Conversation[] @relation("BuyerConvs")
  sellerConvs    Conversation[] @relation("SellerConvs")
  messages       Message[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([province])
  @@index([createdAt])
}

model Profile {
  id            String   @id @default(uuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  bio           String?
  businessName  String?
  sellerVerified Boolean  @default(false)
  ratingAvg     Float    @default(0)
  ratingCount   Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Category {
  id          String     @id @default(uuid())
  name        String
  slug        String     @unique
  sortOrder   Int        @default(0)
  parentId    String?
  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryTree")
  listings    Listing[]
}

model Listing {
  id          String           @id @default(uuid())
  ownerId     String
  owner       User             @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  categoryId  String
  category    Category         @relation(fields: [categoryId], references: [id])
  title       String
  description String
  price       Decimal          @db.Decimal(12, 2)
  currency    Currency         @default(ARS)
  condition   ListingCondition @default(USED)
  status      ListingStatus    @default(ACTIVE)
  province    String
  city        String?
  latitude    Float?
  longitude   Float?
  viewCount   Int              @default(0)
  publishedAt DateTime         @default(now())
  images      ListingImage[]
  favorites   Favorite[]
  reports     Report[]
  conversations Conversation[]
  compras     Compra[]
  deletedAt   DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@index([status, publishedAt])
  @@index([categoryId, status])
  @@index([province, status])
  @@index([ownerId, status])
  @@index([price])
  @@fulltext([title, description])
}

model ListingImage {
  id        String   @id @default(uuid())
  listingId String
  listing   Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  url       String
  publicId  String
  position  Int      @default(0)
  alt       String?

  @@unique([listingId, position])
  @@index([listingId])
}

model Favorite {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  listingId String
  listing   Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, listingId])
  @@index([listingId])
}

model Conversation {
  id            String    @id @default(uuid())
  listingId     String
  listing       Listing   @relation(fields: [listingId], references: [id], onDelete: Cascade)
  buyerId       String
  buyer         User      @relation("BuyerConvs", fields: [buyerId], references: [id], onDelete: Cascade)
  sellerId      String
  seller        User      @relation("SellerConvs", fields: [sellerId], references: [id], onDelete: Cascade)
  messages      Message[]
  lastMessageAt DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([listingId, buyerId, sellerId])
  @@index([buyerId, lastMessageAt])
  @@index([sellerId, lastMessageAt])
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User         @relation(fields: [senderId], references: [id])
  body           String
  readAt         DateTime?
  createdAt      DateTime     @default(now())

  @@index([conversationId, createdAt])
}

model Report {
  id         String       @id @default(uuid())
  reporterId String
  reporter   User         @relation(fields: [reporterId], references: [id])
  listingId  String
  listing    Listing      @relation(fields: [listingId], references: [id], onDelete: Cascade)
  reason     ReportReason
  details    String?
  status     ReportStatus @default(OPEN)
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  acciones   ModerationAction[]

  @@index([status, createdAt])
  @@index([listingId])
}

// Auditoría de las acciones de moderación (RF-25, Slice 5 de la Fase 2):
// registra quién (adminId), cuándo (createdAt) y qué (accion) se hizo sobre
// cada reporte. Append-only: la FK reportId usa onDelete Restrict para que las
// acciones sobrevivan al reporte y no se pierda historia.
enum ModerationActionAccion {
  REVIEWED
  RESOLVED
  DISMISSED
  PAUSED
  REJECTED
}

model ModerationAction {
  id        String                @id @default(uuid())
  reportId  String
  report    Report                @relation(fields: [reportId], references: [id], onDelete: Restrict)
  adminId   String
  admin     User                  @relation("AccionesModeracion", fields: [adminId], references: [id])
  accion    ModerationActionAccion
  detalles  String?
  createdAt DateTime              @default(now())

  @@index([reportId, createdAt])
}

model Compra {
  id             String   @id @default(uuid())
  compradorId    String
  comprador      User     @relation(fields: [compradorId], references: [id], onDelete: Restrict)
  listingId      String
  listing        Listing  @relation(fields: [listingId], references: [id], onDelete: Restrict)
  precioUnitario Decimal  @db.Decimal(12, 2)
  currency       Currency @default(ARS)
  cantidad       Int      @default(1)
  rating         Rating?
  createdAt      DateTime @default(now())

  @@index([compradorId, createdAt])
  @@index([listingId])
}

model Rating {
  id         String   @id @default(uuid())
  compradorId String
  comprador   User     @relation("RatingComprador", fields: [compradorId], references: [id], onDelete: Restrict)
  vendedorId String
  vendedor   User     @relation("RatingVendedor", fields: [vendedorId], references: [id], onDelete: Restrict)
  compraId   String   @unique
  compra     Compra   @relation(fields: [compraId], references: [id], onDelete: Restrict)
  puntaje    Int
  comentario String?
  createdAt  DateTime @default(now())

  @@index([vendedorId])
}
```

## 4. Índices y consideraciones de performance

- **Búsqueda y listados:** índices compuestos en `Listing` para las combinaciones de filtro más frecuentes: `(status, publishedAt)` para home, `(categoryId, status)` y `(province, status)` para filtros, `(ownerId, status)` para "Mis publicaciones".
- **Precio:** índice simple en `price` para el rango de precio; se re-evalúa si el orden por precio es muy usado (podría reemplazarse por índice compuesto con `status`).
- **Favoritos:** índice único `(userId, listingId)` garantiza un favorito por usuario y publicación y acelera el toggle.
- **Compras:** índice `(compradorId, createdAt)` para listar "Mis compras" ordenadas por fecha e índice `(listingId)` para las compras de una publicación.
- **Calificaciones:** índice único en `compraId` garantiza una calificación por compra (RF-27); el índice `(vendedorId)` acelera los agregados del perfil del vendedor (RF-24).
- **Mensajería:** índice `(conversationId, createdAt)` para listar mensajes de un hilo ordenados por fecha.
- **Búsqueda full-text:** `@@fulltext([title, description])` usa `tsvector` nativo de PostgreSQL; si el volumen crece, se migra a un índice GIN o a una herramienta dedicada (p. ej. Postgres trigram / Meilisearch) sin cambiar el contrato de la API.
- **Conteos:** los contadores agregados (vistas, favoritos) se actualizan de forma incremental; se evitan COUNT sobre tablas grandes en listados públicos.
- **Evitar N+1:** consultas de listado con `include`/`select` acotados de Prisma; las imágenes de una tarjeta se traen en una sola consulta.

## 5. Soft delete, timestamps, enums y ubicación

- **Soft delete:** `Listing.deletedAt` oculta la publicación sin borrar el registro (auditoría y re-versión). Las imágenes y favoritos con cascade real se purgan en un job posterior. El estado `DELETED` es la variante explícita de moderación; `deletedAt` marca el momento.
- **Timestamps:** `createdAt`/`updatedAt` en todas las tablas, con `@updatedAt` de Prisma. `lastMessageAt` en Conversación para ordenar bandejas.
- **Enums:** rol, tipo de cuenta, moneda, condición, estado de publicación, motivo y estado de reporte se modelan como enums de Prisma (columnas `enum` en PostgreSQL), lo que evita strings mágicos.
- **Ubicación y geolocalización:** en el MVP se usan `province`, `city` y `locationLabel` (texto) para filtros y display. `latitude`/`longitude` se guardan opcionalmente para permitir más adelante búsquedas por distancia con PostGIS (extensión nativa de Supabase), sin migrar el esquema.
- **Moneda:** `ARS` por defecto, con extensión a `USD` sin romper datos (enum).

## 6. Estrategia de migraciones

- **Workflow:** se edita `schema.prisma`, se genera la migración con `npx prisma migrate dev` en local, se revisa el SQL generado y se aplica. En CI y producción se usa `npx prisma migrate deploy`.
- **Entornos:** base de datos local (Docker o Supabase local), staging y producción con migraciones versionadas en `prisma/migrations/`.
- **Buenas prácticas:**
  - Una migración por cambio lógico; nunca editar migraciones ya aplicadas.
  - Cambios destructivos (borrar columna, cambiar tipo) requieren revisión manual del SQL antes de mergear.
  - Los datos semilla (categorías y subcategorías) viven en un script de seed idempotente por slug, re-ejecutable.
  - Antes de deploy, aplicar migraciones a staging y verificar con datos de prueba.
- **Generación del cliente:** `prisma generate` en el pipeline de CI para que el cliente tipado coincida con el esquema.

## 7. Evolución futura del esquema

- **Fase 2 (Comunidad):** el modelo Conversación/Mensaje entra en pleno uso; se agrega `Notification` (user, tipo, payload JSONB, leída) y se expande `Profile` con datos públicos (tiempo de respuesta típico, en plataforma desde). `ModerationAction` ya está implementada (Slice 5 de la Fase 2, ver §7).
- **Fase 3 (Confianza):** primer slice implementado: `Compra` registra cada compra en la misma transacción que el decremento de stock (RF-26) y `Rating` guarda una calificación por compra con recálculo atómico de `ratingAvg`/`ratingCount` (RF-27). Pendiente en la fase: `sellerVerified` con proceso de verificación de documentos y tablas de pagos/escrow si se procesan internamente.
- **Fase 4 (Escala):** `Subscription`/`PremiumPlan` para publicaciones destacadas y planes; `ServiceListing` como variante con campos específicos de servicios rurales (modalidad, zona de cobertura, disponibilidad) o extensión de `Listing` con discriminador.
- **Búsqueda por distancia:** activación de PostGIS y columna de geografía en `Listing` cuando la búsqueda por radio lo requiera.
- **Auditoría de moderación (implementada, Slice 5 de la Fase 2):** la tabla `ModerationAction` es el registro de auditoría del flujo de moderación (RF-25). Cada fila guarda `reportId` (FK a `Report` con `onDelete: Restrict`: la historia sobrevive al reporte y el borrado falla por Restrict), `adminId` (FK a `User`, relación `AccionesModeracion`), `accion` (enum `ModerationActionAccion`: REVIEWED/RESOLVED/DISMISSED para transiciones de estado y PAUSED/REJECTED para efectos laterales sobre la publicación), `detalles?` y `createdAt`. Es append-only y se escribe en la misma transacción que el cambio que audita; el índice `(reportId, createdAt)` acelera el historial cronológico del detalle. Las transiciones de estado (OPEN → REVIEWED → RESOLVED/DISMISSED) se validan en el service (`validarTransicionReporte`); pausar/rechazar exigen reporte REVIEWED y no mutan el estado del reporte.
- **Notificaciones:** `Notification` (userId, tipo enum, payload JSONB, leída, createdAt) con índice por `(userId, readAt)` para la bandeja de notificaciones.
- **Perfiles públicos:** `Profile` se expande con campos de display público (tiempo de respuesta típico calculado desde `Message`, en plataforma desde `createdAt`), sin exponer datos de contacto salvo los autorizados por el vendedor.

El esquema está diseñado para crecer por fases sin migraciones destructivas en la mayoría de los cambios: cada fase agrega tablas o columnas nuevas en lugar de remodelar las existentes.
