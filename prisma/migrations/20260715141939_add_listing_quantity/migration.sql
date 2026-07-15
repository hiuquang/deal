-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_listings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seller_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "asking_price_jpy" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "trade_type" TEXT NOT NULL,
    "station" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "listings_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_listings" ("asking_price_jpy", "card_id", "condition", "created_at", "id", "image_url", "note", "seller_id", "station", "status", "trade_type", "updated_at") SELECT "asking_price_jpy", "card_id", "condition", "created_at", "id", "image_url", "note", "seller_id", "station", "status", "trade_type", "updated_at" FROM "listings";
DROP TABLE "listings";
ALTER TABLE "new_listings" RENAME TO "listings";
CREATE INDEX "listings_card_id_status_idx" ON "listings"("card_id", "status");
CREATE INDEX "listings_seller_id_idx" ON "listings"("seller_id");
CREATE INDEX "listings_status_created_at_idx" ON "listings"("status", "created_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
