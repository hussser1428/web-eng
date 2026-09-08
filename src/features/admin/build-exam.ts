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
 * Chọn các nhóm (theo thứ tự đã xáo, ưu tiên nhóm đứng trước) sao cho tổng đúng `can` câu.
 * Quy hoạch động kiểu tổng tập con: `truoc[t]` = nhóm cuối dùng để đạt tổng t. Không có tổ hợp
 * nào đúng thì trả tổng lớn nhất đạt được (để báo thiếu).
 */
function chonDuSo(nhomList: string[][], can: number): string[] {
  const truoc: number[] = Array(can + 1).fill(-1);
  truoc[0] = -2; // gốc
  for (let g = 0; g < nhomList.length; g++) {
    const co = nhomList[g].length;
    for (let t = can; t >= co; t--) {
      if (truoc[t] === -1 && truoc[t - co] !== -1) truoc[t] = g;
    }
  }
  let t = can;
  while (t > 0 && truoc[t] === -1) t--;
  const lay: string[][] = [];
  while (t > 0) {
    const g = truoc[t];
    lay.push(nhomList[g]);
    t -= nhomList[g].length;
  }
  return lay.reverse().flat();
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

    const lay = chonDuSo(xaoTron(gomNhom(rows), rand), s.questionCount);
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
