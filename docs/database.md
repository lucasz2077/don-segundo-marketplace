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
- **User** (1)—(0..1) **VendedorMpAccount**: un vendedor vincula una cuenta de Mercado Pago por OAuth (RF-47, Fase 3 Slice 3).
- **Compra** (1)—(N) **SolicitudDevolucion**: una compra puede tener muchas solicitudes de devolución (historial append-only, RF-49).
- **Conversation** (1)—(N) **Message**: un hilo de contacto contiene muchos mensajes. **Conversation** (N)—(N) **User** (participantes, resuelto con tabla pivote implícita).

```
User ──┬──< Listing >──< ListingImage
       │        │
       │        ├──< Favorite >── User (repetido como guardador)
       │        ├──< Report >── User (repetido como denunciante)
       │        ├──< Compra >──< Listing (repetido como comprado)
       │        │        ├──< Rating (0..1 por compra) ──> User (vendedor)
       │        │        └──< SolicitudDevolucion >── User (comprador y vendedor)
       │        └──< Category (self-referencing)
       │
       ├──(0..1) VendedorMpAccount (1:1 por vendedor, tokens OAuth)
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
| sellerVerified | enum | `VerificationStatus`: NONE / PENDING / VERIFIED / REJECTED (antes boolean; migrado en Fase 3, Slice 2) |
| ratingAvg | float | Promedio de calificaciones del vendedor (0-5) |
| ratingCount | int | Cantidad de calificaciones; el bloque de rating se muestra solo con ≥ 3 (RF-24) |
| createdAt / updatedAt | timestamps | |

### SolicitudVerificacion
Registro de cada solicitud de verificación del vendedor (Fase 3, Slice 2, RF-32..RF-36). Append-only: cada solicitud queda en el historial con estado, motivo y autor.
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| vendedorId | uuid | FK → User (el que se verifica), índice |
| dniUrl | string? | URL del documento de identidad. **Solo visible para admin (RNF-15)** |
| domicilioUrl | string? | URL del documento de domicilio. **Solo visible para admin (RNF-15)** |
| estado | enum | `SolicitudVerificacionEstado`: PENDING / APPROVED / REJECTED |
| motivoRechazo | string? | Motivo requerido al rechazar |
| adminId | string? | FK → User (admin que revisó) |
| revisadoAt | datetime? | Fecha de la revisión |
| createdAt | datetime | Fecha de la solicitud |
| @@index([vendedorId, createdAt]) | | Historial cronológico por vendedor |

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
Registra cada compra de una publicación (RF-26). Desde la Fase 3, Slice 3 (pagos/checkout), la compra nace **PENDIENTE** (sin decremento de stock: el stock baja SOLO al aprobarse el pago, RF-26 modificada) y guarda la traza del cobro con Mercado Pago (D1/D3/D5/D6).
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| compradorId | uuid | FK → User (onDelete Restrict) |
| listingId | uuid | FK → Listing (onDelete Restrict) |
| precioUnitario | decimal | Decimal(12,2), precio al momento de la compra |
| currency | enum | ARS, USD |
| cantidad | int | Default 1 (una publicación por compra) |
| estadoPago | enum | `CompraEstadoPago`: PENDIENTE (default) / APROBADO / FALLIDO / REEMBOLSADO / EXPIRADA |
| fechaVencimiento | datetime? | TTL de la orden PENDIENTE (30 min, D5); null en compras legacy |
| marketplaceFee | decimal? | 5% de la plataforma, Decimal(12,2), siempre persistido en compras nuevas (D6) |
| mpPreferenceId | string? | Id de la preferencia Checkout Pro |
| mpPaymentId | string? | Id del pago aprobado en MP (único: una aprobación por compra, RNF-17) |
| aprobadoAt | datetime? | Base de la ventana de 7 días para devolución (RF-50) y de 30 días para calificar (D9) |
| medioPago | string? | payment_method_id de MP (RF-41) |
| reembolsadoAt | datetime? | Marca un reembolso (RF-49/D4) |
| motivoReembolso | enum? | `MotivoReembolso`: DEVOLUCION_VENDEDOR / SIN_STOCK |
| rating | Rating? | 1:1 opcional (a lo sumo una calificación) |
| createdAt | timestamp | Fecha de la compra |

Índices: `(compradorId, createdAt)` para "Mis compras"; `(listingId)` para las compras de una publicación; `(estadoPago, fechaVencimiento)` para la expiración lazy de órdenes PENDIENTES (D5); `mpPaymentId` único (RNF-17).

### VendedorMpAccount
Cuenta de Mercado Pago vinculada a un vendedor vía OAuth (RF-47/RF-48, D2). 1:1 con User; los tokens se guardan SOLO server-side (RNF-20) y se anulan (`revocadaAt`) si MP rechaza el refresh (RF-48).
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid | FK → User (onDelete Cascade), único |
| mpUserId | string | user_id de MP como String (evita problemas de precisión numérica) |
| accessToken | string | Token del vendedor (solo server-side) |
| refreshToken | string? | Para renovar el access token (RF-48) |
| accessTokenExpiresAt | datetime? | Expiración del access token |
| liveMode | boolean | false = sandbox |
| revocadaAt | datetime? | Cuenta revocada (token denegado/vencido sin refresh posible) |
| createdAt / updatedAt | timestamps | |

Índices: `userId` único; `(revocadaAt)` para filtrar cuentas vigentes.

### SolicitudDevolucion
Solicitud de devolución de una compra (RF-49..RF-51, D4). Append-only: cada solicitud queda en el historial con su estado; la FK a Compra usa onDelete Restrict para que la historia sobreviva (patrón SolicitudVerificacion). `vendedorId` está denormalizado (patrón Rating) para la bandeja del vendedor.
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| compraId | uuid | FK → Compra (onDelete Restrict) |
| compradorId | uuid | FK → User (relación `DevolucionesComprador`) |
| vendedorId | uuid | FK → User (relación `DevolucionesVendedor`), denormalizado |
| estado | enum | `SolicitudDevolucionEstado`: PENDIENTE (default) / APROBADA / RECHAZADA |
| motivo | string | Motivo del comprador (RF-49) |
| motivoRechazo | string? | Obligatorio al rechazar (RF-49) |
| montoReembolsado | decimal? | Monto devuelto, Decimal(12,2) |
| mpRefundId | string? | Id del refund en MP (trazabilidad, RF-51) |
| resueltaAt | datetime? | Momento de la resolución |
| createdAt | timestamp | |

Índices: `(vendedorId, estado)` para la bandeja del vendedor; `(compraId, createdAt)` para el historial append-only; `(compradorId, createdAt)`.

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

enum CompraEstadoPago {
  PENDIENTE
  APROBADO
  FALLIDO
  REEMBOLSADO
  EXPIRADA
}

enum SolicitudDevolucionEstado {
  PENDIENTE
  APROBADA
  RECHAZADA
}

enum MotivoReembolso {
  DEVOLUCION_VENDEDOR
  SIN_STOCK
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
  sellerVerified VerificationStatus @default(NONE) @map("seller_verified")
  ratingAvg       Float    @default(0)
  ratingCount     Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
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
  id               String                @id @default(uuid()) @db.Uuid
  compradorId      String                @map("comprador_id") @db.Uuid
  comprador        User                  @relation("ComprasHechas", fields: [compradorId], references: [id], onDelete: Restrict)
  listingId        String                @map("listing_id") @db.Uuid
  listing          Listing               @relation(fields: [listingId], references: [id], onDelete: Restrict)
  precioUnitario   Decimal               @map("precio_unitario") @db.Decimal(12, 2)
  currency         Currency              @default(ARS)
  cantidad         Int                   @default(1)
  estadoPago       CompraEstadoPago      @default(PENDIENTE)
  fechaVencimiento DateTime?             @map("fecha_vencimiento")
  marketplaceFee   Decimal?              @map("marketplace_fee") @db.Decimal(12, 2)
  mpPreferenceId   String?               @unique @map("mp_preference_id")
  mpPaymentId      String?               @unique @map("mp_payment_id")
  aprobadoAt       DateTime?             @map("aprobado_at")
  medioPago        String?               @map("medio_pago")
  reembolsadoAt    DateTime?             @map("reembolsado_at")
  motivoReembolso  MotivoReembolso?      @map("motivo_reembolso")
  rating           Rating?
  solicitudes      SolicitudDevolucion[]
  createdAt        DateTime              @default(now())

  @@index([compradorId, createdAt])
  @@index([listingId])
  @@index([estadoPago, fechaVencimiento])
}

model VendedorMpAccount {
  id                   String    @id @default(uuid()) @db.Uuid
  userId               String    @unique @map("user_id") @db.Uuid
  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  mpUserId             String    @map("mp_user_id")
  accessToken          String    @map("access_token")
  refreshToken         String?   @map("refresh_token")
  accessTokenExpiresAt DateTime? @map("access_token_expires_at")
  liveMode             Boolean   @default(false) @map("live_mode")
  revocadaAt           DateTime? @map("revocada_at")
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@index([revocadaAt])
}

model SolicitudDevolucion {
  id               String                     @id @default(uuid()) @db.Uuid
  compraId         String                     @map("compra_id") @db.Uuid
  compra           Compra                     @relation(fields: [compraId], references: [id], onDelete: Restrict)
  compradorId      String                     @map("comprador_id") @db.Uuid
  comprador        User                       @relation("DevolucionesComprador", fields: [compradorId], references: [id], onDelete: Restrict)
  vendedorId       String                     @map("vendedor_id") @db.Uuid
  vendedor         User                       @relation("DevolucionesVendedor", fields: [vendedorId], references: [id], onDelete: Restrict)
  estado           SolicitudDevolucionEstado  @default(PENDIENTE)
  motivo           String
  motivoRechazo    String?
  montoReembolsado Decimal?                   @map("monto_reembolsado") @db.Decimal(12, 2)
  mpRefundId       String?                    @map("mp_refund_id")
  resueltaAt       DateTime?                  @map("resuelta_at")
  createdAt        DateTime                   @default(now())

  @@index([vendedorId, estado])
  @@index([compraId, createdAt])
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

- **Workflow:** se edita `schema.prisma`, se genera la migración con `npx prisma migrate dev` en local, se revisa el SQL generado y se aplica. En CI y producción se usa `npx prisma migrate deploy`. Nota: en Prisma 7 `migrate dev` exige TTY; el flujo alternativo usado para la migración `20260815000000_pagos_checkout` fue generar el SQL con `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`, crear la carpeta de migración a mano y aplicarla con `migrate deploy` (el flag `--from-url` fue removido en Prisma 7; el datasource se resuelve desde `prisma.config.ts` con `DIRECT_URL ?? DATABASE_URL`).
- **Entornos:** base de datos local (Docker o Supabase local), staging y producción con migraciones versionadas en `prisma/migrations/`.
- **Buenas prácticas:**
  - Una migración por cambio lógico; nunca editar migraciones ya aplicadas.
  - Cambios destructivos (borrar columna, cambiar tipo) requieren revisión manual del SQL antes de mergear.
  - Los datos semilla (categorías y subcategorías) viven en un script de seed idempotente por slug, re-ejecutable.
  - Antes de deploy, aplicar migraciones a staging y verificar con datos de prueba.
- **Backfill de la migración de pagos (D8):** las compras legacy (previas al Slice 3) no tienen flujo de pago; se consideran ya aprobadas para que sus ventanas (calificación 30 días, devolución 7 días) sigan valiendo: `UPDATE "Compra" SET "estado_pago" = 'APROBADO', "aprobado_at" = "createdAt" WHERE "estado_pago" = 'PENDIENTE'`. El backfill se incluyó dentro de la migración `20260815000000_pagos_checkout` (verify: 1 compra legacy pasó a APROBADO).
- **Generación del cliente:** `prisma generate` en el pipeline de CI para que el cliente tipado coincida con el esquema.

## 7. Evolución futura del esquema

- **Fase 2 (Comunidad):** el modelo Conversación/Mensaje entra en pleno uso; se agrega `Notification` (user, tipo, payload JSONB, leída) y se expande `Profile` con datos públicos (tiempo de respuesta típico, en plataforma desde). `ModerationAction` ya está implementada (Slice 5 de la Fase 2, ver §7).
- **Fase 3 (Confianza):** primer slice implementado: `Compra` registra cada compra (RF-26) y `Rating` guarda una calificación por compra con recálculo atómico de `ratingAvg`/`ratingCount` (RF-27). La reseña es visible en el detalle de la publicación vendida (query de reseñas por publicación vía `Compra.listingId`, que ya tiene índice `@@index([listingId])`, con join a `Rating` por `compraId` único — ver RF-30) y el autor puede eliminarla con recálculo inverso atómico del promedio ponderado (RF-31). Slice 2 en curso: `sellerVerified` pasa de boolean a `VerificationStatus` (NONE/PENDING/VERIFIED/REJECTED, columna `seller_verified`) y nace `SolicitudVerificacion` para el flujo self-service + admin (RF-32..RF-36); los documentos (`dniUrl`/`domicilioUrl`) solo los ve el admin (RNF-15). Slice 3 (pagos/checkout) con esquema aplicado (Fase 1): `Compra` suma la traza de cobro con Mercado Pago (`estadoPago`, `fechaVencimiento`, `marketplaceFee`, `mpPreferenceId`, `mpPaymentId` único, `aprobadoAt`, `medioPago`, `reembolsadoAt`, `motivoReembolso`, ver §2) y nacen `VendedorMpAccount` (1:1 con User, tokens OAuth solo server-side, RNF-20) y `SolicitudDevolucion` (historial append-only de devoluciones, RF-49..RF-51).
- **Fase 4 (Escala):** `Subscription`/`PremiumPlan` para publicaciones destacadas y planes; `ServiceListing` como variante con campos específicos de servicios rurales (modalidad, zona de cobertura, disponibilidad) o extensión de `Listing` con discriminador.
- **Búsqueda por distancia:** activación de PostGIS y columna de geografía en `Listing` cuando la búsqueda por radio lo requiera.
- **Auditoría de moderación (implementada, Slice 5 de la Fase 2):** la tabla `ModerationAction` es el registro de auditoría del flujo de moderación (RF-25). Cada fila guarda `reportId` (FK a `Report` con `onDelete: Restrict`: la historia sobrevive al reporte y el borrado falla por Restrict), `adminId` (FK a `User`, relación `AccionesModeracion`), `accion` (enum `ModerationActionAccion`: REVIEWED/RESOLVED/DISMISSED para transiciones de estado y PAUSED/REJECTED para efectos laterales sobre la publicación), `detalles?` y `createdAt`. Es append-only y se escribe en la misma transacción que el cambio que audita; el índice `(reportId, createdAt)` acelera el historial cronológico del detalle. Las transiciones de estado (OPEN → REVIEWED → RESOLVED/DISMISSED) se validan en el service (`validarTransicionReporte`); pausar/rechazar exigen reporte REVIEWED y no mutan el estado del reporte.
- **Notificaciones:** `Notification` (userId, tipo enum, payload JSONB, leída, createdAt) con índice por `(userId, readAt)` para la bandeja de notificaciones.
- **Perfiles públicos:** `Profile` se expande con campos de display público (tiempo de respuesta típico calculado desde `Message`, en plataforma desde `createdAt`), sin exponer datos de contacto salvo los autorizados por el vendedor.

El esquema está diseñado para crecer por fases sin migraciones destructivas en la mayoría de los cambios: cada fase agrega tablas o columnas nuevas en lugar de remodelar las existentes.
