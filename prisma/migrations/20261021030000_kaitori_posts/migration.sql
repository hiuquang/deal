-- CreateTable
CREATE TABLE "kaitori_posts" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "posted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kaitori_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kaitori_post_runs" (
    "id" TEXT NOT NULL,
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "posts_fetched" INTEGER NOT NULL,
    "saved" INTEGER NOT NULL,
    "skipped" TEXT,

    CONSTRAINT "kaitori_post_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kaitori_posts_post_id_key" ON "kaitori_posts"("post_id");

-- CreateIndex
CREATE INDEX "kaitori_posts_posted_at_idx" ON "kaitori_posts"("posted_at");

-- CreateIndex
CREATE INDEX "kaitori_post_runs_ran_at_idx" ON "kaitori_post_runs"("ran_at");

