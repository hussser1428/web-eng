import type { PrismaClient } from "@prisma/client";
import { getCertificate } from "@/features/certificates";

export type CountQuestionsDb = Pick<PrismaClient, "question">;

export type SectionQuestionCount = {
  section: string;
  name: string;
  required: number;
  draft: number;
  published: number;
};

/** Đếm số câu nháp/đã đăng theo từng section của chứng chỉ. Luôn trả đủ mọi section trong CertificateSpec, kể cả 0 câu. */
export async function countQuestions(db: CountQuestionsDb, certificate = "toeic"): Promise<SectionQuestionCount[]> {
  const cert = getCertificate(certificate);
  const rows = await db.question.groupBy({
    by: ["section", "status"],
    where: { certificate },
    _count: { _all: true },
  });

  return cert.sections.map((s) => {
    const draft = rows.find((r) => r.section === s.id && r.status === "DRAFT")?._count._all ?? 0;
    const published = rows.find((r) => r.section === s.id && r.status === "PUBLISHED")?._count._all ?? 0;
    return { section: s.id, name: s.name, required: s.questionCount, draft, published };
  });
}
