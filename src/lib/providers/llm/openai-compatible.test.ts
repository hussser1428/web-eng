import { describe, it, expect, vi, afterEach } from "vitest";
import { createOpenAiCompatible } from "./openai-compatible";

function reply(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

describe("createOpenAiCompatible", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gửi đúng URL, Authorization: Bearer và thân yêu cầu JSON mode", async () => {
    const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://llm.test/v1/chat/completions");
      expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer sk-test");
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
      expect(JSON.parse(String(init.body))).toEqual({
        model: "m1",
        messages: [
          { role: "system", content: "sys" },
          { role: "user", content: "usr" },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 512,
      });
      return reply('{"a":1}');
    });
    const p = createOpenAiCompatible({
      baseUrl: "https://llm.test/v1/",
      apiKey: "sk-test",
      model: "m1",
      fetchFn: fetchFn as never,
    });
    expect(await p.generateJson({ system: "sys", user: "usr", maxTokens: 512 })).toEqual({ a: 1 });
  });

  it("HTTP 429 thì ném LLM_RATE_LIMITED", async () => {
    const fetchFn = vi.fn(async () => new Response("slow down", { status: 429 }));
    const p = createOpenAiCompatible({
      baseUrl: "https://llm.test/v1",
      apiKey: "k",
      model: "m1",
      fetchFn: fetchFn as never,
    });
    await expect(p.generateJson({ system: "s", user: "u" })).rejects.toThrow("LLM_RATE_LIMITED");
  });

  it("HTTP 500 thì ném LLM_UNAVAILABLE", async () => {
    const fetchFn = vi.fn(async () => new Response("boom", { status: 500 }));
    const p = createOpenAiCompatible({
      baseUrl: "https://llm.test/v1",
      apiKey: "k",
      model: "m1",
      fetchFn: fetchFn as never,
    });
    await expect(p.generateJson({ system: "s", user: "u" })).rejects.toThrow("LLM_UNAVAILABLE");
  });

  it("nội dung không phải JSON thì ném LLM_BAD_JSON", async () => {
    const fetchFn = vi.fn(async () => reply("xin lỗi, tôi không thể"));
    const p = createOpenAiCompatible({
      baseUrl: "https://llm.test/v1",
      apiKey: "k",
      model: "m1",
      fetchFn: fetchFn as never,
    });
    await expect(p.generateJson({ system: "s", user: "u" })).rejects.toThrow("LLM_BAD_JSON");
  });

  it("bóc được JSON nằm trong rào markdown", async () => {
    const fetchFn = vi.fn(async () => reply('```json\n{"items":[1,2]}\n```'));
    const p = createOpenAiCompatible({
      baseUrl: "https://llm.test/v1",
      apiKey: "k",
      model: "m1",
      fetchFn: fetchFn as never,
    });
    expect(await p.generateJson({ system: "s", user: "u" })).toEqual({ items: [1, 2] });
  });

  it("timeout huỷ request và ném LLM_UNAVAILABLE", async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        (init.signal as AbortSignal).addEventListener("abort", () => reject(new Error("aborted")));
      });
    });
    const p = createOpenAiCompatible({
      baseUrl: "https://llm.test/v1",
      apiKey: "k",
      model: "m1",
      fetchFn: fetchFn as never,
      timeoutMs: 50,
    });
    const promise = p.generateJson({ system: "s", user: "u" });
    vi.advanceTimersByTime(50);
    await expect(promise).rejects.toThrow("LLM_UNAVAILABLE");
    expect(vi.getTimerCount()).toBe(0);
  });
});
