-- CreateTable
CREATE TABLE "AudioFile" (
    "id" TEXT NOT NULL,
    "mime" TEXT NOT NULL DEFAULT 'audio/mpeg',
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioFile_pkey" PRIMARY KEY ("id")
);
