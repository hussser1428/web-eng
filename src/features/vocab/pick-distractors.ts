import type { PrismaClient } from "@prisma/client";

export type DistractorDb = Pick<PrismaClient, "word">;

/** Số đáp án nhiễu mỗi câu — cộng đáp án đúng là bốn lựa chọn. */
export const DISTRACTOR_COUNT = 3;

/** Số từ lấy ra mỗi lần truy vấn để bốc ngẫu nhiên. */
const POOL_SIZE = 50;

export type Distractor = { id: string; headword: string; meaningVi: string };

/**
 * Bốc ngẫu nhiên từ `pool` cho tới khi đủ `n` từ, bỏ qua từ có nghĩa đã dùng.
 * `used` được chia sẻ giữa hai lượt truy vấn nên nhiễu không bao giờ trùng nghĩa nhau.
 */
function takeRandom(pool: Distractor[], n: number, rand: () => number, used: Set<string>): Distractor[] {
  const out: Distractor[] = [];
  const rest = [...pool];
  while (out.length < n && rest.length > 0) {
    const i = Math.min(rest.length - 1, Math.floor(rand() * rest.length));
    const [w] = rest.splice(i, 1);
    if (used.has(w.meaningVi)) continue;
    used.add(w.meaningVi);
    out.push(w);
  }
  return out;
}

/**
 * Ba đáp án nhiễu cho một câu trắc nghiệm từ vựng (spec mục 6):
 * cùng loại từ, khác nghĩa, ưu tiên từ chính người dùng đã lưu.
 */
export async function pickDistractors(
  db: DistractorDb,
  p: { userId: string; word: { id: string; pos: string | null; meaningVi: string }; count?: number; rand?: () => number },
): Promise<Distractor[]> {
  const count = p.count ?? DISTRACTOR_COUNT;
  const rand = p.rand ?? Math.random;
  const used = new Set([p.word.meaningVi]);
  const where = { id: { not: p.word.id }, ...(p.word.pos ? { pos: p.word.pos } : {}) };
  const select = { id: true, headword: true, meaningVi: true };

  const cuaToi: Distractor[] = await db.word.findMany({
    where: { ...where, userWords: { some: { userId: p.userId } } },
    take: POOL_SIZE,
    select,
  });
  const out = takeRandom(cuaToi, count, rand, used);

  if (out.length < count) {
    const chung: Distractor[] = await db.word.findMany({ where, take: POOL_SIZE, select });
    out.push(...takeRandom(chung, count - out.length, rand, used));
  }

  if (out.length < count) throw new Error("NOT_ENOUGH_WORDS");
  return out;
}
