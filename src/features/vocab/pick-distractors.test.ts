import { describe, it, expect, vi } from "vitest";
import { pickDistractors, DISTRACTOR_COUNT, type Distractor } from "./pick-distractors";

const DICH = { id: "w1", pos: "n", meaningVi: "quả táo" };

function w(id: string, headword: string, meaningVi: string) {
  return { id, headword, meaningVi };
}

/** rand giả luôn trả 0 nên luôn lấy phần tử đầu còn lại — kết quả khoá được. */
const randDau = () => 0;

type FindManyArgs = {
  where: Record<string, unknown>;
  take: number;
  select: unknown;
};

describe("pickDistractors", () => {
  it("lấy đủ ba nhiễu từ những từ người dùng đã lưu, cùng loại từ", async () => {
    const findMany = vi.fn<(args: FindManyArgs) => Promise<Distractor[]>>(async () => [w("w2", "book", "quyển sách"), w("w3", "car", "xe hơi"), w("w4", "dog", "con chó")]);
    const r = await pickDistractors({ word: { findMany } } as never, { userId: "u1", word: DICH, rand: randDau });

    expect(r).toHaveLength(DISTRACTOR_COUNT);
    expect(r.map((x) => x.headword)).toEqual(["book", "car", "dog"]);
    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ id: { not: "w1" }, pos: "n", userWords: { some: { userId: "u1" } } });
  });

  it("từ đã lưu không đủ thì lấy thêm từ bảng Word chung", async () => {
    const findMany = vi.fn<(args: FindManyArgs) => Promise<Distractor[]>>();
    findMany
      .mockResolvedValueOnce([w("w2", "book", "quyển sách")])
      .mockResolvedValueOnce([w("w5", "egg", "quả trứng"), w("w6", "fish", "con cá")]);

    const r = await pickDistractors({ word: { findMany } } as never, { userId: "u1", word: DICH, rand: randDau });

    expect(r.map((x) => x.headword)).toEqual(["book", "egg", "fish"]);
    expect(findMany).toHaveBeenCalledTimes(2);
    const args = findMany.mock.calls[1][0];
    expect(args.where).not.toHaveProperty("userWords");
  });

  it("bỏ qua từ trùng nghĩa với đáp án đúng", async () => {
    const findMany = vi.fn<(args: FindManyArgs) => Promise<Distractor[]>>(async () => [
      w("w2", "apple tree", "quả táo"),
      w("w3", "car", "xe hơi"),
      w("w4", "dog", "con chó"),
      w("w7", "egg", "quả trứng"),
    ]);
    const r = await pickDistractors({ word: { findMany } } as never, { userId: "u1", word: DICH, rand: randDau });
    expect(r.map((x) => x.meaningVi)).not.toContain("quả táo");
    expect(r).toHaveLength(3);
  });

  it("hai nhiễu không được trùng nghĩa nhau", async () => {
    const findMany = vi.fn<(args: FindManyArgs) => Promise<Distractor[]>>(async () => [
      w("w2", "car", "xe hơi"),
      w("w3", "automobile", "xe hơi"),
      w("w4", "dog", "con chó"),
      w("w5", "cat", "con mèo"),
    ]);
    const r = await pickDistractors({ word: { findMany } } as never, { userId: "u1", word: DICH, rand: randDau });
    expect(new Set(r.map((x) => x.meaningVi)).size).toBe(3);
  });

  it("từ không có loại từ thì không lọc theo pos", async () => {
    const findMany = vi.fn<(args: FindManyArgs) => Promise<Distractor[]>>(async () => [w("w2", "book", "quyển sách"), w("w3", "car", "xe hơi"), w("w4", "dog", "con chó")]);
    await pickDistractors({ word: { findMany } } as never, { userId: "u1", word: { ...DICH, pos: null }, rand: randDau });
    const args = findMany.mock.calls[0][0];
    expect(args.where).not.toHaveProperty("pos");
  });

  it("từ điển không đủ từ thì ném NOT_ENOUGH_WORDS", async () => {
    const findMany = vi.fn<(args: FindManyArgs) => Promise<Distractor[]>>(async () => [w("w2", "book", "quyển sách")]);
    await expect(
      pickDistractors({ word: { findMany } } as never, { userId: "u1", word: DICH, rand: randDau }),
    ).rejects.toThrow("NOT_ENOUGH_WORDS");
  });
});
