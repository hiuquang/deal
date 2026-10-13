-- AlterTable
ALTER TABLE "reference_prices" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'rao',
ADD COLUMN     "source_url" TEXT;

