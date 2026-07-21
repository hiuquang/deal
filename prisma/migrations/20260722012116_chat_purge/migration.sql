-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "messages_purge_at" TIMESTAMP(3),
ADD COLUMN     "messages_purged_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "conversations_messages_purge_at_idx" ON "conversations"("messages_purge_at");

