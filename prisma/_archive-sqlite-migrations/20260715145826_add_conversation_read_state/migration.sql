-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "buyer_last_read_at" DATETIME;
ALTER TABLE "conversations" ADD COLUMN "seller_last_read_at" DATETIME;
