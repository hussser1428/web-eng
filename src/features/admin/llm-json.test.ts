import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { askLlmJson } from "./llm-json";

const schema = z.object({ ten: z.string() });
const prompt = { system: "hệ thống", user: "câu hỏi" };

function fakeLlm() {
  const generateJson = vi.fn<(a: { system: string; user: string }) => Promise<unknown>>();
  return { llm: { generateJson } as never, generateJson };
}

describe("askLlmJson", () => {
  it("trả dữ liệu đã qua schema khi model đúng ngay lần đầu", async () => {
    const { llm, generateJson } = fakeLlm();
    generateJson.mockResolvedValue({ ten: "An", thua: 1 });

    await expect(askLlmJson(llm, prompt, schema)).resolves.toEqual({ ten: "An" });
    expect(generateJson).toHaveBeenCalledTimes(1);
    expect(generateJson.mock.calls[0][0]).toEqual(prompt);
  });

  it("thử lại một lần kèm ghi chú lỗi khi JSON không khớp schema", async () => {
    const { llm, generateJson } = fakeLlm();
    generateJson.mockResolvedValueOnce({ sai: true }).mockResolvedValueOnce({ ten: "An" });

    await expect(askLlmJson(llm, prompt, schema)).resolves.toEqual({ ten: "An" });
    expect(generateJson).toHaveBeenCalledTimes(2);
    expect(generateJson.mock.calls[1][0].user).toContain("Previous JSON was invalid");
    expect(generateJson.mock.calls[1][0].user).toContain("ten");
    expect(generateJson.mock.calls[1][0].system).toBe(prompt.system);
  });

  it("thử lại một lần khi provider ném LLM_BAD_JSON", async () => {
    const { llm, generateJson } = fakeLlm();
    generateJson.mockRejectedValueOnce(new Error("LLM_BAD_JSON")).mockResolvedValueOnce({ ten: "An" });

    await expect(askLlmJson(llm, prompt, schema)).resolves.toEqual({ ten: "An" });
    expect(generateJson.mock.calls[1][0].user).toContain("not valid JSON");
  });

  it("ném LLM_BAD_JSON sau hai lần sai", async () => {
    const { llm, generateJson } = fakeLlm();
    generateJson.mockResolvedValue({ sai: true });

    await expect(askLlmJson(llm, prompt, schema)).rejects.toThrow("LLM_BAD_JSON");
    expect(generateJson).toHaveBeenCalledTimes(2);
  });

  it("không thử lại khi hết hạn mức hoặc dịch vụ hỏng", async () => {
    for (const ma of ["LLM_RATE_LIMITED", "LLM_UNAVAILABLE", "fetch failed"]) {
      const { llm, generateJson } = fakeLlm();
      generateJson.mockRejectedValue(new Error(ma));

      await expect(askLlmJson(llm, prompt, schema)).rejects.toThrow(ma);
      expect(generateJson).toHaveBeenCalledTimes(1);
    }
  });
});
