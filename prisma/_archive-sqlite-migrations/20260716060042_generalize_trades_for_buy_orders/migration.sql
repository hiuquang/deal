-- Tổng quát hóa trades cho buy-order (P9): listing_id nullable + buy_order_id,
-- denormalize card_id/condition/quantity (nguồn cho price_record, hết phụ
-- thuộc listing). Backfill card_id/condition cho trade cũ bằng JOIN listings
-- ngay trong câu INSERT (mọi trade cũ đều có listing_id).
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_trades" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listing_id" TEXT,
    "buy_order_id" TEXT,
    "conversation_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "initiator_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "final_price_jpy" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "auto_close_at" DATETIME NOT NULL,
    "confirmed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "trades_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "trades_buy_order_id_fkey" FOREIGN KEY ("buy_order_id") REFERENCES "buy_orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "trades_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trades_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trades_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trades_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_trades" ("auto_close_at", "buyer_id", "confirmed_at", "conversation_id", "created_at", "final_price_jpy", "id", "initiator_id", "listing_id", "seller_id", "status", "updated_at", "card_id", "condition", "quantity")
SELECT t."auto_close_at", t."buyer_id", t."confirmed_at", t."conversation_id", t."created_at", t."final_price_jpy", t."id", t."initiator_id", t."listing_id", t."seller_id", t."status", t."updated_at", l."card_id", l."condition", 1
FROM "trades" t JOIN "listings" l ON l."id" = t."listing_id";
DROP TABLE "trades";
ALTER TABLE "new_trades" RENAME TO "trades";
CREATE INDEX "trades_buyer_id_idx" ON "trades"("buyer_id");
CREATE INDEX "trades_seller_id_idx" ON "trades"("seller_id");
CREATE INDEX "trades_listing_id_idx" ON "trades"("listing_id");
-- Tạo lại partial unique index cũ (redefine bảng làm mất) — 1 listing chỉ có
-- 1 trade còn sống. NULL được coi là phân biệt nên trade buy-order (listing_id
-- NULL) không đụng index này.
CREATE UNIQUE INDEX "trades_one_active_per_listing" ON "trades" ("listing_id") WHERE "status" != 'cancelled';
-- Mới (P9): 1 hội thoại chỉ có 1 trade còn sống — tuyến phòng thủ race cho
-- trade buy-order (và bao luôn trade listing: 1 listing-conversation ≤ 1 trade).
CREATE UNIQUE INDEX "trades_one_active_per_conversation" ON "trades" ("conversation_id") WHERE "status" != 'cancelled';
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
