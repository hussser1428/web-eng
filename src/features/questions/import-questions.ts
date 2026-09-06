import type { PrismaClient, QuestionSource } from "@prisma/client";
import { getCertificate, getSection } from "@/features/certificates";
import type { QuestionFile } from "./import-schema";

export type ImportDb = Pick<PrismaClient, "questionGroup" | "question" | "exam" | "examQuestion">;

export type ImportResult = { groups: number; questions: number; examId: string | null };

export async function importQuestions(
  db: ImportDb,
  data: QuestionFile,
  opts: { publish: boolean; examTitle?: string; source?: QuestionSource },
): Promise<ImportResult> {
  const cert = getCertificate(data.certificate);
  const status = opts.publish ? "PUBLISHED" : "DRAFT";

  // Kiểm tra toàn bộ trước khi ghi để không nhập nửa chừng
  for (const g of data.groups) {
    if (!getSection(cert, g.section)) throw new Error(`INVALID_SECTION:${g.section}`);
  }
  const groupKeys = new Set(data.groups.map((g) => g.key));
  data.questions.forEach((q, i) => {
    const s = getSection(cert, q.section);
    if (!s) throw new Error(`INVALID_SECTION:${q.section}`);
    if (q.choices.length !== s.choiceCount) throw new Error(`INVALID_CHOICES:${i}`);
    if (q.groupKey && !groupKeys.has(q.groupKey)) throw new Error(`UNKNOWN_GROUP:${q.groupKey}`);
  });

  const groupIds = new Map<string, string>();
  for (const g of data.groups) {
    const created = await db.questionGroup.create({
      data: { certificate: cert.id, section: g.section, passage: g.passage, transcript: g.transcript, audioUrl: g.audioUrl, imageUrl: g.imageUrl },
    });
    groupIds.set(g.key, created.id);
  }

  const questionIds: string[] = [];
  for (const q of data.questions) {
    const created = await db.question.create({
      data: {
        certificate: cert.id,
        section: q.section,
        status,
        groupId: q.groupKey ? groupIds.get(q.groupKey) : undefined,
        stem: q.stem,
        choices: q.choices,
        answer: q.answer,
        explanation: q.explanation,
        skillTags: q.skillTags,
        audioUrl: q.audioUrl,
        imageUrl: q.imageUrl,
        transcript: q.transcript,
        source: opts.source ?? "IMPORT",
      },
    });
    questionIds.push(created.id);
  }

  let examId: string | null = null;
  if (opts.examTitle) {
    const exam = await db.exam.create({ data: { certificate: cert.id, title: opts.examTitle, status } });
    examId = exam.id;
    await db.examQuestion.createMany({ data: questionIds.map((questionId, i) => ({ examId: exam.id, questionId, order: i + 1 })) });
  }

  return { groups: data.groups.length, questions: data.questions.length, examId };
}
