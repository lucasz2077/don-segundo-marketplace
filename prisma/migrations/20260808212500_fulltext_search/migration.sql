-- Full-text search index for listings (Spanish)
-- Prisma schema cannot declare @@fulltext in v7, so we add it as a custom migration.
CREATE INDEX "listing_fulltext_idx" ON "Listing"
  USING GIN (
    to_tsvector('spanish', coalesce("title", '') || ' ' || coalesce("description", ''))
  );
