/** Một câu người dùng đã gặp: thuộc phần thi nào, gắn kỹ năng gì, đúng hay sai. */
export type AnswerRow = { section: string; skillTags: string[]; isCorrect: boolean | null };

/** Tỉ lệ đúng của một nhóm (phần thi hoặc kỹ năng). `rate` trong khoảng 0–1. */
export type RateItem = { key: string; correct: number; total: number; rate: number };

export type Weakness = { bySection: RateItem[]; byTag: RateItem[] };

/** Kỹ năng phải có ít nhất ngần này câu đã làm mới được xét (spec mục 6). */
export const MIN_TAG_ANSWERS = 5;

function tally(rows: AnswerRow[], keysOf: (r: AnswerRow) => string[]): RateItem[] {
  const map = new Map<string, { correct: number; total: number }>();
  for (const r of rows) {
    for (const key of new Set(keysOf(r))) {
      const cur = map.get(key) ?? { correct: 0, total: 0 };
      cur.total++;
      if (r.isCorrect) cur.correct++;
      map.set(key, cur);
    }
  }
  return [...map].map(([key, v]) => ({ key, correct: v.correct, total: v.total, rate: v.correct / v.total }));
}

/** Yếu nhất trước; hoà thì theo tên để thứ tự ổn định. */
function weakestFirst(a: RateItem, b: RateItem) {
  return a.rate - b.rate || a.key.localeCompare(b.key);
}

export function computeWeakness(rows: AnswerRow[]): Weakness {
  const answered = rows.filter((r) => r.isCorrect !== null);
  const bySection = tally(answered, (r) => [r.section]).sort(weakestFirst);
  const byTag = tally(answered, (r) => r.skillTags)
    .filter((t) => t.total >= MIN_TAG_ANSWERS)
    .sort(weakestFirst);
  return { bySection, byTag };
}
