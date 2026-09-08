import { describe, it, expect } from "vitest";
import { flattenParagraphs } from "./flatten";

describe("flattenParagraphs", () => {
  it("đánh số order liên tục qua các đoạn, giữ paragraphIndex", () => {
    const { rows } = flattenParagraphs([
      [
        { en: "One two", vi: "Một hai" },
        { en: "Three", vi: "Ba" },
      ],
      [{ en: "Four five six", vi: "Bốn năm sáu" }],
    ]);

    expect(rows.map((r) => r.order)).toEqual([1, 2, 3]);
    expect(rows.map((r) => r.paragraphIndex)).toEqual([0, 0, 1]);
  });

  it("đếm từ tiếng Anh, bỏ qua khoảng trắng thừa", () => {
    const { wordCount } = flattenParagraphs([[{ en: "  One   two three  ", vi: "x" }]]);
    expect(wordCount).toBe(3);
  });

  it("đoạn rỗng không sinh câu nhưng không làm lệch số thứ tự", () => {
    const { rows, wordCount } = flattenParagraphs([[], [{ en: "One", vi: "Một" }]]);
    expect(rows).toEqual([{ order: 1, paragraphIndex: 1, en: "One", vi: "Một" }]);
    expect(wordCount).toBe(1);
  });
});
