import { describe, it, expect, vi, afterEach } from "vitest";
import { createLibreTranslate } from "./libretranslate";

describe("createLibreTranslate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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
    try {
      await p.translate("x", "en", "vi");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe("TRANSLATE_UNAVAILABLE");
      expect((err as Error).cause).toBeDefined();
    }
  });

  it("lỗi mạng thì ném TRANSLATE_UNAVAILABLE", async () => {
    const fetchFn = vi.fn(async () => { throw new TypeError("fetch failed"); });
    const p = createLibreTranslate({ baseUrl: "http://lt", fetchFn: fetchFn as never });
    await expect(p.translate("x", "en", "vi")).rejects.toThrow("TRANSLATE_UNAVAILABLE");
  });

  it("200 nhưng thiếu translatedText thì ném TRANSLATE_UNAVAILABLE", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    const p = createLibreTranslate({ baseUrl: "http://lt", fetchFn: fetchFn as never });
    await expect(p.translate("x", "en", "vi")).rejects.toThrow("TRANSLATE_UNAVAILABLE");
  });

  it("timeout qua AbortController thì ném TRANSLATE_UNAVAILABLE", async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        (init.signal as AbortSignal).addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      });
    });
    const p = createLibreTranslate({ baseUrl: "http://lt", fetchFn: fetchFn as never, timeoutMs: 50 });
    const promise = p.translate("x", "en", "vi");
    vi.advanceTimersByTime(50);
    try {
      await promise;
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe("TRANSLATE_UNAVAILABLE");
    }
    expect(vi.getTimerCount()).toBe(0);
  });
});
