import { describe, it, expect } from "vitest";
import { readingFileSchema } from "@/features/reading/import-schema";
import { GENRES, LEVELS } from "@/features/reading/labels";
import { buildReadingPrompt, example, LENGTH_WORDS, type ReadingLength } from "./reading";

describe("buildReadingPrompt", () => {
  it("ví dụ JSON parse được bằng readingFileSchema", () => {
    const parsed = readingFileSchema.safeParse(example);
    expect(parsed.success, parsed.error?.issues[0]?.message).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.paragraphs).toHaveLength(2);
    expect(parsed.data.genre).toBe("FAIRY_TALE");
    expect(parsed.data.level).toBe("A2");
    expect(parsed.data.sourceName).toBe("AI (do hệ thống tạo)");
    expect(parsed.data.license).toBe("Nội dung do AI tạo cho mục đích học tập");
    expect(parsed.data.sourceUrl).toBeUndefined();
    for (const doan of parsed.data.paragraphs) expect(doan.length).toBeGreaterThanOrEqual(3);
  });

  it("prompt chứa số từ mục tiêu của từng độ dài", () => {
    for (const [length, words] of Object.entries(LENGTH_WORDS)) {
      const { user } = buildReadingPrompt({ genre: "NEWS", level: "B1", length: length as ReadingLength });
      expect(user).toContain(`about ${words} words`);
      expect(user).toContain("±20%");
    }
  });

  it("prompt chứa hướng dẫn của đúng thể loại và độ khó được chọn", () => {
    for (const genre of GENRES) {
      for (const level of LEVELS) {
        const { system, user } = buildReadingPrompt({ genre, level, length: "short" });
        expect(user).toContain(`Genre — ${genre}:`);
        expect(user).toContain(`Level — ${level}:`);
        expect(user).toContain(`Set "genre" to "${genre}"`);
        expect(user).toContain(`"level" to "${level}"`);
        expect(user).toContain("3–6 sentences");
        expect(system).toContain("Vietnamese");
        expect(system).toContain("JSON");
      }
    }
  });

  it("nhắc không dùng nhân vật/người thật ở thể loại ANIME và NEWS", () => {
    expect(buildReadingPrompt({ genre: "ANIME", level: "B1", length: "short" }).user).toContain("no character or series that belongs to someone else");
    expect(buildReadingPrompt({ genre: "NEWS", level: "B1", length: "short" }).user).toContain("do not name any real one");
  });

  it("có chủ đề thì ghim chủ đề, không có thì để model tự chọn", () => {
    const co = buildReadingPrompt({ genre: "HUMOR", level: "B2", length: "medium", topic: "một chuyến tàu muộn" });
    expect(co.user).toContain("Topic: một chuyến tàu muộn.");

    const khong = buildReadingPrompt({ genre: "HUMOR", level: "B2", length: "medium" });
    expect(khong.user).toContain("Choose a topic that suits the genre.");
    expect(khong.user).not.toContain("Topic:");
  });
});
