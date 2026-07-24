-- CreateTable
CREATE TABLE "reference_prices" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_jpy" INTEGER NOT NULL,
    "note" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reference_prices_card_id_recorded_at_idx" ON "reference_prices"("card_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "reference_prices_card_id_source_recorded_at_key" ON "reference_prices"("card_id", "source", "recorded_at");

-- AddForeignKey
ALTER TABLE "reference_prices" ADD CONSTRAINT "reference_prices_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

