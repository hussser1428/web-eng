import * as part2 from "./part2";
import * as part3 from "./part3";
import * as part4 from "./part4";
import * as part5 from "./part5";
import * as part6 from "./part6";
import * as part7 from "./part7";

/** Các phần thi sinh được bằng AI. Part 1 cần ảnh nên chưa hỗ trợ; Part 2–4 sinh transcript rồi tạo audio sau. */
export type PromptSection = "toeic.p2" | "toeic.p3" | "toeic.p4" | "toeic.p5" | "toeic.p6" | "toeic.p7";

const PARTS: Record<PromptSection, { system: string; user: (count: number, skillTag?: string) => string }> = {
  "toeic.p2": part2,
  "toeic.p3": part3,
  "toeic.p4": part4,
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
