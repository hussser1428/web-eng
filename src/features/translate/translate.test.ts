import { describe, it, expect, vi, beforeEach } from "vitest";
import { translateText, cacheKey } from "./translate";

const word = { id: "1", headword: "book", phonetic: null, pos: "danh từ", meaningVi: "sách", exampleEn: null, exampleVi: null };

function makeDeps(cacheRows: Record<string, string> = {}) {
  const db = {
    word: {
      findMany: vi.fn(async ({ where }: { where: { headword: { in: string[] } } }) =>
        where.headword.in.includes("book") ? [word] : []
      ),
    },
    translationCache: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) =>
        cacheRows[where.key] ? { key: where.key, result: cacheRows[where.key] } : null
      ),
      create: vi.fn(async () => ({})),
    },
  };
  const provider = { translate: vi.fn(async (t: string) => `[dịch] ${t}`) };
  return { db, provider };
}

describe("translateText", () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it("từ đơn có trong từ điển thì trả kind word, không gọi provider", async () => {
    const r = await translateText(deps as never, " Books ");
    expect(r).toEqual({ kind: "word", word, from: "en", to: "vi" });
    expect(deps.provider.translate).not.toHaveBeenCalled();
  });

  it("cụm từ thì gọi provider và ghi cache", async () => {
    const r = await translateText(deps as never, "postpone the meeting");
    expect(r).toEqual({ kind: "text", from: "en", to: "vi", result: "[dịch] postpone the meeting" });
    expect(deps.db.translationCache.create).toHaveBeenCalledOnce();
  });

  it("có cache thì không gọi provider", async () => {
    const key = cacheKey("xin chào", "vi", "en");
    deps = makeDeps({ [key]: "hello" });
    const r = await translateText(deps as never, "xin chào");
    expect(r).toEqual({ kind: "text", from: "vi", to: "en", result: "hello" });
    expect(deps.provider.translate).not.toHaveBeenCalled();
  });

  it("provider lỗi thì kind unavailable", async () => {
    deps.provider.translate.mockRejectedValueOnce(new Error("TRANSLATE_UNAVAILABLE"));
    const r = await translateText(deps as never, "some phrase here");
    expect(r).toEqual({ kind: "unavailable", from: "en", to: "vi" });
  });

  it("từ chối rỗng và quá dài", async () => {
    await expect(translateText(deps as never, "   ")).rejects.toThrow("EMPTY");
    await expect(translateText(deps as never, "a".repeat(501))).rejects.toThrow("TEXT_TOO_LONG");
  });

  it("cacheKey không phân biệt hoa thường và khoảng trắng hai đầu", () => {
    expect(cacheKey(" Hello ", "en", "vi")).toBe(cacheKey("hello", "en", "vi"));
    expect(cacheKey("hello", "en", "vi")).not.toBe(cacheKey("hello", "vi", "en"));
  });
});
