import type { PrismaClient } from "@prisma/client";
import { getCertificate } from "@/features/certificates";

export type BuildExamDb = Pick<PrismaClient, "question" | "exam" | "examQuestion">;

export type Shortage = { section: string; need: number; have: number };

export type BuildExamResult =
  | { ok: true; examId: string }
  | { ok: false; error: "NOT_ENOUGH_QUESTIONS"; shortage: Shortage[] };

type Row = { id: string; groupId: string | null; createdAt: Date };

/** Xáo trộn Fisher–Yates trên bản sao, dùng `rand` tiêm được để test khoá được kết quả. */
function xaoTron<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Gom câu theo `groupId`, câu lẻ thành nhóm cỡ 1. Trong nhóm giữ nguyên thứ tự đầu vào (createdAt). */
function gomNhom(rows: Row[]): string[][] {
  const theoNhom = new Map<string, string[]>();
  const nhomList: string[][] = [];
  for (const r of rows) {
    if (!r.groupId) {
      nhomList.push([r.id]);
      continue;
    }
    const co = theoNhom.get(r.groupId);
    if (co) {
      co.push(r.id);
      continue;
    }
    const moi = [r.id];
    theoNhom.set(r.groupId, moi);
    nhomList.push(moi);
  }
  return nhomList;
}

/**
 * Ghép một đề đủ số câu mỗi phần từ kho câu đã đăng. Câu có `groupId` luôn lấy nguyên nhóm:
 * nhóm nào làm vượt số câu của phần thì bỏ qua, đi tiếp nhóm sau.
 * Thiếu dù chỉ một phần thì trả `shortage` và **không** tạo gì, tránh đề lệch.
 */
export async function buildExam(
  db: BuildExamDb,
  input: { certificate?: string; title: string; rand?: () => number },
): Promise<BuildExamResult> {
  const cert = getCertificate(input.certificate ?? "toeic");
  const rand = input.rand ?? Math.random;

  const shortage: Shortage[] = [];
  const cauHoi: string[] = [];

  for (const s of cert.sections) {
    const rows = (await db.question.findMany({
      where: { certificate: cert.id, section: s.id, status: "PUBLISHED" },
      select: { id: true, groupId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    })) as unknown as Row[];

    const lay: string[] = [];
    for (const nhom of xaoTron(gomNhom(rows), rand)) {
      if (lay.length + nhom.length > s.questionCount) continue;
      lay.push(...nhom);
      if (lay.length === s.questionCount) break;
    }

    if (lay.length < s.questionCount) shortage.push({ section: s.id, need: s.questionCount, have: lay.length });
    cauHoi.push(...lay);
  }

  if (shortage.length > 0) return { ok: false, error: "NOT_ENOUGH_QUESTIONS", shortage };

  const exam = await db.exam.create({ data: { certificate: cert.id, title: input.title, status: "DRAFT" } });
  await db.examQuestion.createMany({
    data: cauHoi.map((questionId, i) => ({ examId: exam.id, questionId, order: i + 1 })),
  });
  return { ok: true, examId: exam.id };
}
