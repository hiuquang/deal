-- CreateTable
CREATE TABLE "buy_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyer_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "max_unit_price_jpy" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "buy_orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "buy_orders_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "buy_order_offers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buy_order_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "buy_order_offers_buy_order_id_fkey" FOREIGN KEY ("buy_order_id") REFERENCES "buy_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "buy_order_offers_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listing_id" TEXT,
    "buy_order_id" TEXT,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT,
    "buyer_last_read_at" DATETIME,
    "seller_last_read_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "conversations_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "conversations_buy_order_id_fkey" FOREIGN KEY ("buy_order_id") REFERENCES "buy_orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "conversations_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conversations_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_conversations" ("buyer_id", "buyer_last_read_at", "created_at", "id", "listing_id", "seller_last_read_at", "updated_at") SELECT "buyer_id", "buyer_last_read_at", "created_at", "id", "listing_id", "seller_last_read_at", "updated_at" FROM "conversations";
DROP TABLE "conversations";
ALTER TABLE "new_conversations" RENAME TO "conversations";
CREATE UNIQUE INDEX "conversations_listing_id_buyer_id_key" ON "conversations"("listing_id", "buyer_id");
CREATE UNIQUE INDEX "conversations_buy_order_id_seller_id_key" ON "conversations"("buy_order_id", "seller_id");
-- Backfill seller_id cho hội thoại cũ (đến từ listing) — trước đây seller được
-- suy từ listing.seller_id; nay lưu trực tiếp để hỗ trợ cả hội thoại từ BuyOrder.
UPDATE "conversations"
SET "seller_id" = (SELECT "seller_id" FROM "listings" WHERE "listings"."id" = "conversations"."listing_id")
WHERE "seller_id" IS NULL AND "listing_id" IS NOT NULL;
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "buy_orders_card_id_status_idx" ON "buy_orders"("card_id", "status");

-- CreateIndex
CREATE INDEX "buy_orders_status_created_at_idx" ON "buy_orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "buy_orders_buyer_id_idx" ON "buy_orders"("buyer_id");

-- CreateIndex
CREATE INDEX "buy_order_offers_buy_order_id_created_at_idx" ON "buy_order_offers"("buy_order_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "buy_order_offers_buy_order_id_seller_id_key" ON "buy_order_offers"("buy_order_id", "seller_id");
