/*
  Warnings:

  - Made the column `seller_id` on table `conversations` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listing_id" TEXT,
    "buy_order_id" TEXT,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "buyer_last_read_at" DATETIME,
    "seller_last_read_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "conversations_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "conversations_buy_order_id_fkey" FOREIGN KEY ("buy_order_id") REFERENCES "buy_orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "conversations_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conversations_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_conversations" ("buy_order_id", "buyer_id", "buyer_last_read_at", "created_at", "id", "listing_id", "seller_id", "seller_last_read_at", "updated_at") SELECT "buy_order_id", "buyer_id", "buyer_last_read_at", "created_at", "id", "listing_id", "seller_id", "seller_last_read_at", "updated_at" FROM "conversations";
DROP TABLE "conversations";
ALTER TABLE "new_conversations" RENAME TO "conversations";
CREATE INDEX "conversations_buyer_id_idx" ON "conversations"("buyer_id");
CREATE INDEX "conversations_seller_id_idx" ON "conversations"("seller_id");
CREATE UNIQUE INDEX "conversations_listing_id_buyer_id_key" ON "conversations"("listing_id", "buyer_id");
CREATE UNIQUE INDEX "conversations_buy_order_id_seller_id_key" ON "conversations"("buy_order_id", "seller_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
