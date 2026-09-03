import { describe, it, expect, vi } from "vitest";
import { lookupWord } from "./lookup";

const words = [
  { id: "1", headword: "book", phonetic: "buk", pos: "danh từ", meaningVi: "sách", exampleEn: null, exampleVi: null },
  { id: "2", headword: "books", phonetic: null, pos: "danh từ", meaningVi: "sổ sách", exampleEn: null, exampleVi: null },
  { id: "3", headword: "run", phonetic: null, pos: "động từ", meaningVi: "chạy", exampleEn: null, exampleVi: null },
];

const db = {
  word: {
    findMany: vi.fn(async ({ where }: { where: { headword: { in: string[] } } }) =>
      words.filter((w) => where.headword.in.includes(w.headword))
    ),
  },
};

describe("lookupWord", () => {
  it("khớp đúng từ được ưu tiên hơn dạng gốc", async () => {
    expect((await lookupWord(db as never, "Books"))?.id).toBe("2");
  });
  it("tra được qua dạng gốc", async () => {
    expect((await lookupWord(db as never, "running"))?.id).toBe("3");
  });
  it("không có thì null", async () => {
    expect(await lookupWord(db as never, "xyzzy")).toBeNull();
  });
  it("chuỗi nhiều từ thì null", async () => {
    expect(await lookupWord(db as never, "run fast")).toBeNull();
  });
});
