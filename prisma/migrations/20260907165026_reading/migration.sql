-- CreateEnum
CREATE TYPE "ReadingGenre" AS ENUM ('HUMOR', 'FAIRY_TALE', 'ANIME', 'NEWS');

-- CreateEnum
CREATE TYPE "ReadingLevel" AS ENUM ('A2', 'B1', 'B2', 'C1');

-- CreateTable
CREATE TABLE "Reading" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "genre" "ReadingGenre" NOT NULL,
    "level" "ReadingLevel" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "license" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "QuestionSource" NOT NULL DEFAULT 'IMPORT',
    "wordCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingSentence" (
    "id" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "paragraphIndex" INTEGER NOT NULL,
    "en" TEXT NOT NULL,
    "vi" TEXT NOT NULL,

    CONSTRAINT "ReadingSentence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reading_status_genre_level_idx" ON "Reading"("status", "genre", "level");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingSentence_readingId_order_key" ON "ReadingSentence"("readingId", "order");

-- AddForeignKey
ALTER TABLE "ReadingSentence" ADD CONSTRAINT "ReadingSentence_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading"("id") ON DELETE CASCADE ON UPDATE CASCADE;
