-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "buy_order_id" TEXT,
ALTER COLUMN "listing_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "comments_buy_order_id_created_at_idx" ON "comments"("buy_order_id", "created_at");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_buy_order_id_fkey" FOREIGN KEY ("buy_order_id") REFERENCES "buy_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

