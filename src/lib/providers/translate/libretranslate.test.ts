import { describe, it, expect, vi } from "vitest";
import { createLibreTranslate } from "./libretranslate";

describe("createLibreTranslate", () => {
  it("gọi POST /translate và trả translatedText", async () => {
    const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("http://lt/translate");
      expect(JSON.parse(String(init.body))).toEqual({ q: "hello", source: "en", target: "vi", format: "text" });
      return new Response(JSON.stringify({ translatedText: "xin chào" }), { status: 200 });
    });
    const p = createLibreTranslate({ baseUrl: "http://lt", fetchFn: fetchFn as never });
    expect(await p.translate("hello", "en", "vi")).toBe("xin chào");
  });

  it("HTTP lỗi thì ném TRANSLATE_UNAVAILABLE", async () => {
    const fetchFn = vi.fn(async () => new Response("bad", { status: 500 }));
    const p = createLibreTranslate({ baseUrl: "http://lt", fetchFn: fetchFn as never });
    await expect(p.translate("x", "en", "vi")).rejects.toThrow("TRANSLATE_UNAVAILABLE");
  });

  it("lỗi mạng thì ném TRANSLATE_UNAVAILABLE", async () => {
    const fetchFn = vi.fn(async () => { throw new TypeError("fetch failed"); });
    const p = createLibreTranslate({ baseUrl: "http://lt", fetchFn: fetchFn as never });
    await expect(p.translate("x", "en", "vi")).rejects.toThrow("TRANSLATE_UNAVAILABLE");
  });
});
