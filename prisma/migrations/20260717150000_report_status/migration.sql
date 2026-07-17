-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "resolved_at" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

