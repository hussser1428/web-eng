import type { PrismaClient } from "@prisma/client";
import { getCertificate, getSection } from "@/features/certificates";
import type { UpdateQuestionInput } from "./update-question-schema";

export type UpdateQuestionDb = Pick<PrismaClient, "question">;

/**
 * Ghi đè nội dung một câu hỏi. Kiểm lại theo `CertificateSpec` vì Zod không biết phần thi:
 * `INVALID_CHOICES` khi số lựa chọn khác `choiceCount` của section, `INVALID_ANSWER` khi đáp án
 * nằm ngoài danh sách. Trường tuỳ chọn để trống thì xoá giá trị cũ.
 */
export async function updateQuestion(db: UpdateQuestionDb, id: string, input: UpdateQuestionInput): Promise<void> {
  const row = await db.question.findUnique({ where: { id }, select: { certificate: true, section: true } });
  if (!row) throw new Error("NOT_FOUND");

  const spec = getSection(getCertificate(row.certificate), row.section);
  if (spec && input.choices.length !== spec.choiceCount) throw new Error("INVALID_CHOICES");
  if (input.answer >= input.choices.length) throw new Error("INVALID_ANSWER");

  await db.question.update({
    where: { id },
    data: {
      stem: input.stem ?? null,
      choices: input.choices,
      answer: input.answer,
      explanation: input.explanation,
      skillTags: input.skillTags,
      audioUrl: input.audioUrl ?? null,
      imageUrl: input.imageUrl ?? null,
      transcript: input.transcript ?? null,
    },
  });
}
