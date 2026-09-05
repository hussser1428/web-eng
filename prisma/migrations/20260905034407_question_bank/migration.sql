-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('AI', 'IMPORT', 'MANUAL');

-- CreateEnum
CREATE TYPE "AttemptType" AS ENUM ('EXAM', 'DRILL');

-- CreateTable
CREATE TABLE "QuestionGroup" (
    "id" TEXT NOT NULL,
    "certificate" TEXT NOT NULL DEFAULT 'toeic',
    "section" TEXT NOT NULL,
    "passage" TEXT,
    "transcript" TEXT,
    "audioUrl" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "QuestionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "certificate" TEXT NOT NULL DEFAULT 'toeic',
    "section" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "groupId" TEXT,
    "stem" TEXT,
    "choices" JSONB NOT NULL,
    "answer" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "skillTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audioUrl" TEXT,
    "imageUrl" TEXT,
    "transcript" TEXT,
    "source" "QuestionSource" NOT NULL DEFAULT 'IMPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "certificate" TEXT NOT NULL DEFAULT 'toeic',
    "title" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "examId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("examId","questionId")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "certificate" TEXT NOT NULL DEFAULT 'toeic',
    "type" "AttemptType" NOT NULL,
    "examId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "overtime" BOOLEAN NOT NULL DEFAULT false,
    "scores" JSONB,
    "config" JSONB,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "chosen" INTEGER,
    "isCorrect" BOOLEAN,

    CONSTRAINT "AttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_certificate_section_status_idx" ON "Question"("certificate", "section", "status");

-- CreateIndex
CREATE INDEX "ExamQuestion_examId_order_idx" ON "ExamQuestion"("examId", "order");

-- CreateIndex
CREATE INDEX "Attempt_userId_certificate_submittedAt_idx" ON "Attempt"("userId", "certificate", "submittedAt");

-- CreateIndex
CREATE INDEX "AttemptAnswer_attemptId_order_idx" ON "AttemptAnswer"("attemptId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptAnswer_attemptId_questionId_key" ON "AttemptAnswer"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "QuestionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
