# Modelo de datos — marketplace-campo

## 1. Modelo entidad-relación

Entidades principales y sus relaciones:

- **User** (1)—(N) **Listing**: un usuario vendedor publica muchas publicaciones.
- **User** (1)—(N) **Favorite**: un usuario guarda muchas publicaciones en favoritos.
- **User** (1)—(N) **Conversation / Message**: un usuario participa en muchas conversaciones (como comprador o vendedor) y envía mensajes.
- **User** (1)—(N) **Notification**: un usuario recibe muchas notificaciones; opcionalmente apuntan a una **Listing**.
- **User** (1)—(N) **Direccion**: un usuario guarda varias direcciones de entrega, una predeterminada.
- **Report** (1)—(N) **ModerationAction** (N)—(1) **User** (admin): auditoría append-only de la moderación (RF-25).
- **User** (1)—(N) **SolicitudVerificacion**: historial de verificaciones del vendedor, revisadas por un admin (RF-32..RF-36).
- **User** (1)—(N) **Session / Account**: tablas de Better Auth (sesiones y credenciales).
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
       │        │        └──< ModerationAction >── User (admin)
       │        ├──< Compra >──< Listing (repetido como comprado)
       │        │        ├──< Rating (0..1 por compra) ──> User (vendedor)
       │        │        └──< SolicitudDevolucion >── User (comprador y vendedor)
       │        └──< Category (self-referencing)
       │
       ├──(0..1) VendedorMpAccount (1:1 por vendedor, tokens OAuth)
       ├──(0..1) Profile (perfil público de vendedor)
       ├──< SolicitudVerificacion >── User (admin revisor)
       ├──< Direccion
       ├──< Notification >──(0..1) Listing
       ├──< Session / Account (Better Auth)
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
| lastName | string? | Apellido |
| dni | string? | DNI (datos personales, `/perfil/informacion`) |
| passwordHash | string? | Null si usa solo proveedor OAuth |
| image | string? | Avatar (URL Cloudinary) |
| phone | string? | Contacto telefónico |
| role | enum | USER, ADMIN |
| accountType | enum | BUYER, SELLER, BOTH |
| locationLabel | string | "San Pedro, Buenos Aires" |
| province | string? | Código/nombre de provincia (índice) |
| emailVerified | boolean | Default false (Better Auth) |
| createdAt / updatedAt | timestamps | |

Las credenciales viven en `Account` (Better Auth), no en `passwordHash`, que se conserva por compatibilidad.

### Profile
Se modela como extensión del User (perfil de vendedor público).
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid | FK → User, único (1:1 con User) |
| bio | text? | Descripción breve |
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
| dniUrl | string? | **Legado:** URL pública del documento de identidad (solicitudes previas a los documentos privados). Se migra con `prisma/scripts/privatizar-documentos-verificacion.ts` |
| domicilioUrl | string? | **Legado:** URL pública del documento de domicilio (idem `dniUrl`) |
| dniPublicId | string? | public_id del documento de identidad como asset **privado** de Cloudinary (type `authenticated`, `<userId>/<uuid>`). **Solo lo ve el admin (RNF-15)** |
| domicilioPublicId | string? | public_id del documento de domicilio, mismo tratamiento que `dniPublicId` |
| estado | enum | `SolicitudVerificacionEstado`: PENDING / APPROVED / REJECTED |
| motivoRechazo | string? | Motivo requerido al rechazar |
| adminId | string? | FK → User (admin que revisó) |
| revisadoAt | datetime? | Fecha de la revisión |
| createdAt | datetime | Fecha de la solicitud |
| @@index([vendedorId, createdAt]) | | Historial cronológico por vendedor |

### Category
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
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
| stock | int | Default 1; baja solo al aprobarse un pago (RF-26/RF-45, RNF-18) |
| soldCount | int | Default 0; unidades vendidas |
| province | string | Índice para filtro por ubicación |
| city | string? | Localidad |
| latitude / longitude | float? | Geolocalización opcional |
| viewCount | int | Contador de vistas |
| publishedAt | timestamps | |
| deletedAt | timestamps? | Soft delete |
| createdAt / updatedAt | timestamps | |

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

### ModerationAction
Auditoría append-only de la moderación (RF-25, Fase 2 Slice 5). Detalle en §7.
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| reportId | uuid | FK → Report (onDelete Restrict: la historia sobrevive al reporte) |
| adminId | uuid | FK → User (relación `AccionesModeracion`) |
| accion | enum | `ModerationActionAccion`: REVIEWED / RESOLVED / DISMISSED / PAUSED / REJECTED |
| detalles | string? | Comentario del admin |
| createdAt | timestamp | |

Índice: `(reportId, createdAt)` para el historial del reporte.

### Notification
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid | FK → User (onDelete Cascade) |
| listingId | uuid? | FK → Listing (onDelete Cascade), contexto opcional |
| title | string | Título visible |
| body | string | Texto visible |
| tipo | enum | `NotificationTipo`: GENERAL / MENSAJE_NUEVO / FAVORITO_CAMBIO_PRECIO / FAVORITO_CAMBIO_ESTADO / ESTADO_PUBLICACION |
| payload | json? | Datos extra del evento |
| readAt | datetime? | Null = no leída |
| createdAt | timestamp | |

Índices: `(userId, readAt)` para el contador de no leídas y `(userId, createdAt)` para la bandeja.

### Direccion
Direcciones de entrega del usuario (`/perfil/direcciones`).
| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid | FK → User (onDelete Cascade), índice |
| calle | string | |
| ciudad | string | |
| provincia | string | |
| codigoPostal | string | |
| pisoDepto | string? | |
| referencia | string? | Indicaciones para la entrega |
| esPredeterminada | boolean | Default false |
| createdAt / updatedAt | timestamps | |

### Session, Account y Verification (Better Auth)
Tablas que administra Better Auth (`src/lib/auth.ts`); el código de la app no las escribe directamente.
- **Session**: `token` único, `expiresAt`, `ipAddress?`, `userAgent?`, `userId` (FK → User, Cascade).
- **Account**: credenciales por proveedor (`providerId`, `accountId`); con email + contraseña guarda el hash en `password`. Campos de tokens OAuth (`accessToken`, `refreshToken`, `idToken` y vencimientos) sin uso hoy. **No** confundir con `VendedorMpAccount`.
- **Verification**: tokens de verificación (`identifier`, `value`, `expiresAt`).

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
| estadoPago | enum | `CompraEstadoPago`: PENDIENTE (default) / APROBADO / FALLIDO / REEMBOLSO_PENDIENTE (pago a devolver cuyo refund en MP aún no se confirmó; lo reintenta el cron) / REEMBOLSADO / EXPIRADA |
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

Copia textual de `prisma/schema.prisma` (la fuente de verdad es ese archivo). Para verificar que no diverjan:

```bash
diff <(sed -n '/^```prisma/,/^```/p' docs/database.md | sed '1d;$d') prisma/schema.prisma
```

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  importFileExtension = ""
}

datasource db {
  provider  = "postgresql"
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

enum VerificationStatus {
  NONE
  PENDING
  VERIFIED
  REJECTED
}

enum SolicitudVerificacionEstado {
  PENDING
  APPROVED
  REJECTED
}

enum CompraEstadoPago {
  PENDIENTE
  APROBADO
  FALLIDO
  /// Pago aprobado que hay que devolver (p. ej. sin stock) y cuyo reembolso en
  /// Mercado Pago todavía no se confirmó; el cron de pagos lo reintenta.
  REEMBOLSO_PENDIENTE
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

enum ModerationActionAccion {
  REVIEWED
  RESOLVED
  DISMISSED
  PAUSED
  REJECTED
}

enum NotificationTipo {
  GENERAL
  MENSAJE_NUEVO
  FAVORITO_CAMBIO_PRECIO
  FAVORITO_CAMBIO_ESTADO
  ESTADO_PUBLICACION
}

model User {
  id            String       @id @default(uuid())
  email         String       @unique
  name          String
  lastName      String?
  dni           String?
  passwordHash  String?
  image         String?
  phone         String?
  role          Role         @default(USER)
  accountType   AccountType  @default(BOTH)
  locationLabel String       @default("")
  province      String?
  emailVerified Boolean      @default(false)
  profile       Profile?
  listings      Listing[]
  direcciones   Direccion[]
  favorites     Favorite[]
  reports            Report[]
  accionesModeracion ModerationAction[] @relation("AccionesModeracion")
  buyerConvs         Conversation[] @relation("BuyerConvs")
  sellerConvs   Conversation[] @relation("SellerConvs")
  messages      Message[]
  notifications Notification[]
  sessions      Session[]
  accounts      Account[]
  compras       Compra[]
  ratingsDados     Rating[] @relation("RatingComprador")
  ratingsRecibidos Rating[] @relation("RatingVendedor")
  verificacionesSolicitadas SolicitudVerificacion[] @relation("VerificacionesVendedor")
  verificacionesRevisadas   SolicitudVerificacion[] @relation("VerificacionesAdmin")
  vendedorMp                VendedorMpAccount?
  devolucionesCompradas     SolicitudDevolucion[]   @relation("DevolucionesComprador")
  devolucionesVendidas      SolicitudDevolucion[]   @relation("DevolucionesVendedor")
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([province])
  @@index([createdAt])
}

model Session {
  id        String   @id @default(uuid())
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Account {
  id                    String    @id @default(uuid())
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
}

model Verification {
  id         String   @id @default(uuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
}

model Profile {
  id             String   @id @default(uuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id])
  bio            String?
  businessName   String?
  sellerVerified VerificationStatus @default(NONE) @map("seller_verified")
  ratingAvg      Float    @default(0)
  ratingCount    Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Category {
  id        String     @id @default(uuid())
  name      String
  slug      String     @unique
  sortOrder Int        @default(0)
  parentId  String?
  parent    Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")
  listings  Listing[]
}

model Listing {
  id            String           @id @default(uuid())
  ownerId       String
  owner         User             @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  categoryId    String
  category      Category         @relation(fields: [categoryId], references: [id])
  title         String
  description   String
  price         Decimal          @db.Decimal(12, 2)
  currency      Currency         @default(ARS)
  condition     ListingCondition @default(USED)
  status        ListingStatus    @default(ACTIVE)
  stock         Int              @default(1)
  soldCount     Int              @default(0)
  province      String
  city          String?
  latitude      Float?
  longitude     Float?
  viewCount     Int             @default(0)
  publishedAt   DateTime        @default(now())
  images        ListingImage[]
  favorites     Favorite[]
  reports       Report[]
  conversations Conversation[]
  notifications Notification[]
  compras       Compra[]
  deletedAt     DateTime?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([status, publishedAt])
  @@index([categoryId, status])
  @@index([province, status])
  @@index([ownerId, status])
  @@index([price])
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
  acciones   ModerationAction[]
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  @@index([status, createdAt])
  @@index([listingId])
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

model Notification {
  id        String           @id @default(uuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  listingId String?
  listing   Listing?         @relation(fields: [listingId], references: [id], onDelete: Cascade)
  title     String
  body      String
  tipo      NotificationTipo @default(GENERAL)
  payload   Json?
  readAt    DateTime?
  createdAt DateTime         @default(now())

  @@index([userId, readAt])
  @@index([userId, createdAt])
}

model Direccion {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  calle           String
  ciudad          String
  provincia       String
  codigoPostal    String
  pisoDepto       String?
  referencia      String?
  esPredeterminada Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
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
  // Campos de pago (Fase 3, Slice 3 — pagos/checkout, D1/D6):
  // el estado de pago nace PENDIENTE; la orden expira por TTL (D5) y el
  // decremento de stock ocurre SOLO al aprobarse el pago (RF-26 modificada).
  estadoPago            CompraEstadoPago       @default(PENDIENTE) @map("estado_pago")
  fechaVencimiento      DateTime?              @map("fecha_vencimiento")
  marketplaceFee        Decimal?               @db.Decimal(12, 2) @map("marketplace_fee")
  mpPreferenceId        String?                @map("mp_preference_id")
  mpPaymentId           String?                @unique @map("mp_payment_id")
  aprobadoAt            DateTime?              @map("aprobado_at")
  medioPago             String?                @map("medio_pago")
  reembolsadoAt         DateTime?              @map("reembolsado_at")
  motivoReembolso       MotivoReembolso?       @map("motivo_reembolso")
  solicitudesDevolucion SolicitudDevolucion[]
  createdAt      DateTime @default(now())

  @@index([compradorId, createdAt])
  @@index([listingId])
  @@index([estadoPago, fechaVencimiento])
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

model SolicitudVerificacion {
  id           String                       @id @default(uuid())
  vendedorId   String
  vendedor     User                         @relation("VerificacionesVendedor", fields: [vendedorId], references: [id], onDelete: Cascade)
  // Legado: URLs públicas de Cloudinary de solicitudes anteriores a RNF-15
  // estricto. Las nuevas guardan solo el public_id de un asset privado
  // (type "authenticated") y el admin lo ve vía /api/verificaciones/[id]/documentos/[tipo].
  dniUrl       String?
  domicilioUrl String?
  dniPublicId       String?
  domicilioPublicId String?
  estado       SolicitudVerificacionEstado  @default(PENDING)
  motivoRechazo String?
  adminId      String?
  admin        User?                        @relation("VerificacionesAdmin", fields: [adminId], references: [id], onDelete: SetNull)
  revisadoAt   DateTime?
  createdAt    DateTime                     @default(now())

  @@index([vendedorId, createdAt])
}

/// Cuenta de Mercado Pago vinculada a un vendedor vía OAuth (RF-47/RF-48, D2).
/// 1:1 con User; los tokens se guardan SOLO server-side (RNF-20) y se anulan
/// (revocadaAt) si MP rechaza el refresh (RF-48). `mpUserId` es String para
/// evitar problemas de precisión numérica con el user_id de MP.
model VendedorMpAccount {
  id                   String   @id @default(uuid())
  userId               String   @unique
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  mpUserId             String
  accessToken          String
  refreshToken         String?
  accessTokenExpiresAt DateTime?
  liveMode             Boolean  @default(false)
  revocadaAt           DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@index([revocadaAt])
}

/// Solicitud de devolución de una compra (RF-49..RF-51, D4). Append-only:
/// cada solicitud queda en el historial con su estado; la FK a Compra usa
/// onDelete Restrict para que la historia sobreviva (patrón SolicitudVerificacion).
/// `vendedorId` está denormalizado (patrón Rating) para la bandeja del vendedor.
model SolicitudDevolucion {
  id               String                    @id @default(uuid())
  compraId         String
  compra           Compra                    @relation(fields: [compraId], references: [id], onDelete: Restrict)
  compradorId      String
  comprador        User                      @relation("DevolucionesComprador", fields: [compradorId], references: [id])
  vendedorId       String
  vendedor         User                      @relation("DevolucionesVendedor", fields: [vendedorId], references: [id])
  estado           SolicitudDevolucionEstado @default(PENDIENTE)
  motivo           String
  motivoRechazo    String?
  montoReembolsado Decimal?                  @db.Decimal(12, 2)
  mpRefundId       String?
  resueltaAt       DateTime?
  createdAt        DateTime                  @default(now())

  @@index([vendedorId, estado])
  @@index([compraId, createdAt])
  @@index([compradorId, createdAt])
}
```

## 4. Índices y consideraciones de performance

- **Búsqueda y listados:** índices compuestos en `Listing` para las combinaciones de filtro más frecuentes: `(status, publishedAt)` para home, `(categoryId, status)` y `(province, status)` para filtros, `(ownerId, status)` para "Mis publicaciones".
- **Precio:** índice simple en `price` para el rango de precio; se re-evalúa si el orden por precio es muy usado (podría reemplazarse por índice compuesto con `status`).
- **Favoritos:** índice único `(userId, listingId)` garantiza un favorito por usuario y publicación y acelera el toggle.
- **Compras:** índice `(compradorId, createdAt)` para listar "Mis compras" ordenadas por fecha e índice `(listingId)` para las compras de una publicación.
- **Calificaciones:** índice único en `compraId` garantiza una calificación por compra (RF-27); el índice `(vendedorId)` acelera los agregados del perfil del vendedor (RF-24).
- **Mensajería:** índice `(conversationId, createdAt)` para listar mensajes de un hilo ordenados por fecha; `(buyerId, lastMessageAt)` y `(sellerId, lastMessageAt)` para las bandejas; único `(listingId, buyerId, sellerId)` para un solo hilo por publicación y par de usuarios.
- **Notificaciones:** `(userId, readAt)` para el contador de no leídas y `(userId, createdAt)` para la bandeja.
- **Pagos:** `(estadoPago, fechaVencimiento)` en `Compra` para expirar órdenes PENDIENTES; `mpPaymentId` único (RNF-17); `VendedorMpAccount.revocadaAt` para el cron de tokens; `SolicitudDevolucion` con `(vendedorId, estado)`, `(compraId, createdAt)` y `(compradorId, createdAt)`.
- **Moderación:** `Report (status, createdAt)` para la cola del admin y `ModerationAction (reportId, createdAt)` para el historial.
- **Búsqueda full-text:** índice GIN `listing_fulltext_idx` sobre `to_tsvector('spanish', title || ' ' || description)`, creado a mano en la migración `20260808212500_fulltext_search` (Prisma 7 no permite declarar `@@fulltext`, por eso no figura en el esquema de §3). Si el volumen crece, se evalúa trigram o una herramienta dedicada (p. ej. Meilisearch) sin cambiar el contrato de la API.
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

- **Fase 2 (Comunidad):** el modelo Conversación/Mensaje entra en pleno uso; `Notification` está implementada (ver §2) y `Profile` expone datos públicos (tiempo de respuesta típico, en plataforma desde). `ModerationAction` ya está implementada (Slice 5 de la Fase 2, ver más abajo en esta sección).
- **Fase 3 (Confianza):** primer slice implementado: `Compra` registra cada compra (RF-26) y `Rating` guarda una calificación por compra con recálculo atómico de `ratingAvg`/`ratingCount` (RF-27). La reseña es visible en el detalle de la publicación vendida (query de reseñas por publicación vía `Compra.listingId`, que ya tiene índice `@@index([listingId])`, con join a `Rating` por `compraId` único — ver RF-30) y el autor puede eliminarla con recálculo inverso atómico del promedio ponderado (RF-31). Slice 2 en curso: `sellerVerified` pasa de boolean a `VerificationStatus` (NONE/PENDING/VERIFIED/REJECTED, columna `seller_verified`) y nace `SolicitudVerificacion` para el flujo self-service + admin (RF-32..RF-36); los documentos (`dniPublicId`/`domicilioPublicId`, assets privados; `dniUrl`/`domicilioUrl` legado) solo los ve el admin (RNF-15). Slice 3 (pagos/checkout) con esquema aplicado (Fase 1): `Compra` suma la traza de cobro con Mercado Pago (`estadoPago`, `fechaVencimiento`, `marketplaceFee`, `mpPreferenceId`, `mpPaymentId` único, `aprobadoAt`, `medioPago`, `reembolsadoAt`, `motivoReembolso`, ver §2) y nacen `VendedorMpAccount` (1:1 con User, tokens OAuth solo server-side, RNF-20) y `SolicitudDevolucion` (historial append-only de devoluciones, RF-49..RF-51).
- **Fase 4 (Escala):** `Subscription`/`PremiumPlan` para publicaciones destacadas y planes; `ServiceListing` como variante con campos específicos de servicios rurales (modalidad, zona de cobertura, disponibilidad) o extensión de `Listing` con discriminador.
- **Búsqueda por distancia:** activación de PostGIS y columna de geografía en `Listing` cuando la búsqueda por radio lo requiera.
- **Auditoría de moderación (implementada, Slice 5 de la Fase 2):** la tabla `ModerationAction` es el registro de auditoría del flujo de moderación (RF-25). Cada fila guarda `reportId` (FK a `Report` con `onDelete: Restrict`: la historia sobrevive al reporte y el borrado falla por Restrict), `adminId` (FK a `User`, relación `AccionesModeracion`), `accion` (enum `ModerationActionAccion`: REVIEWED/RESOLVED/DISMISSED para transiciones de estado y PAUSED/REJECTED para efectos laterales sobre la publicación), `detalles?` y `createdAt`. Es append-only y se escribe en la misma transacción que el cambio que audita; el índice `(reportId, createdAt)` acelera el historial cronológico del detalle. Las transiciones de estado (OPEN → REVIEWED → RESOLVED/DISMISSED) se validan en el service (`validarTransicionReporte`); pausar/rechazar exigen reporte REVIEWED y no mutan el estado del reporte.
- **Notificaciones:** `Notification` (userId, tipo enum, payload JSONB, leída, createdAt) con índice por `(userId, readAt)` para la bandeja de notificaciones.
- **Perfiles públicos:** `Profile` se expande con campos de display público (tiempo de respuesta típico calculado desde `Message`, en plataforma desde `createdAt`), sin exponer datos de contacto salvo los autorizados por el vendedor.

El esquema está diseñado para crecer por fases sin migraciones destructivas en la mayoría de los cambios: cada fase agrega tablas o columnas nuevas en lugar de remodelar las existentes.
