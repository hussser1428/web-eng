import { describe, it, expect } from "vitest";
import { computeWeakness, MIN_TAG_ANSWERS, type AnswerRow } from "./weakness";

/** Tạo n câu giống nhau, trong đó `correct` câu đầu là đúng. */
function rows(section: string, tags: string[], total: number, correct: number): AnswerRow[] {
  return Array.from({ length: total }, (_, i) => ({ section, skillTags: tags, isCorrect: i < correct }));
}

describe("computeWeakness", () => {
  it("tính tỉ lệ đúng theo phần thi, yếu nhất đứng đầu", () => {
    const w = computeWeakness([
      ...rows("toeic.p5", [], 4, 3), // 75%
      ...rows("toeic.p7", [], 4, 1), // 25%
    ]);
    expect(w.bySection).toEqual([
      { key: "toeic.p7", correct: 1, total: 4, rate: 0.25 },
      { key: "toeic.p5", correct: 3, total: 4, rate: 0.75 },
    ]);
  });

  it("bỏ câu chưa trả lời", () => {
    const w = computeWeakness([
      { section: "toeic.p5", skillTags: [], isCorrect: true },
      { section: "toeic.p5", skillTags: [], isCorrect: null },
      { section: "toeic.p5", skillTags: [], isCorrect: null },
    ]);
    expect(w.bySection).toEqual([{ key: "toeic.p5", correct: 1, total: 1, rate: 1 }]);
  });

  it(`tag dưới ${MIN_TAG_ANSWERS} câu bị loại khỏi byTag`, () => {
    const w = computeWeakness([
      ...rows("toeic.p5", ["ngữ pháp"], 5, 1),
      ...rows("toeic.p5", ["từ vựng"], 4, 0),
    ]);
    expect(w.byTag.map((t) => t.key)).toEqual(["ngữ pháp"]);
  });

  it("tag trùng trong một câu chỉ tính một lần", () => {
    const w = computeWeakness(rows("toeic.p5", ["ngữ pháp", "ngữ pháp"], 5, 2));
    expect(w.byTag).toEqual([{ key: "ngữ pháp", correct: 2, total: 5, rate: 0.4 }]);
  });

  it("hai tag cùng tỉ lệ thì sắp theo tên cho ổn định", () => {
    const w = computeWeakness([
      ...rows("toeic.p5", ["suy luận"], 5, 1),
      ...rows("toeic.p5", ["danh động từ"], 5, 1),
    ]);
    expect(w.byTag.map((t) => t.key)).toEqual(["danh động từ", "suy luận"]);
  });

  it("không có câu nào thì trả hai danh sách rỗng", () => {
    expect(computeWeakness([])).toEqual({ bySection: [], byTag: [] });
  });
});
