import * as part5 from "./part5";
import * as part6 from "./part6";
import * as part7 from "./part7";

/** Các phần thi sinh được bằng AI. Part 1–4 cần audio/ảnh nên chưa hỗ trợ. */
export type PromptSection = "toeic.p5" | "toeic.p6" | "toeic.p7";

const PARTS: Record<PromptSection, { system: string; user: (count: number, skillTag?: string) => string }> = {
  "toeic.p5": part5,
  "toeic.p6": part6,
  "toeic.p7": part7,
};

/** Prompt viết bằng tiếng Anh cho model, nhưng bắt buộc `explanation` bằng tiếng Việt. */
export function buildPrompt(
  section: PromptSection,
  opts: { count: number; skillTag?: string },
): { system: string; user: string } {
  const part = PARTS[section];
  if (!part) throw new Error("UNSUPPORTED_SECTION");
  return { system: part.system, user: part.user(opts.count, opts.skillTag) };
}
