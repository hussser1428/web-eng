import { describe, it, expect } from "vitest";
import { audioUrlSchema, audioUrlOf, RELATIVE_AUDIO_RE } from "./audio-url";

describe("audioUrlOf", () => {
  it("sinh đường dẫn tương đối từ id", () => {
    expect(audioUrlOf("abc123")).toBe("/api/audio/abc123");
  });
});

describe("audioUrlSchema", () => {
  it("nhận URL http(s) tuyệt đối", () => {
    expect(audioUrlSchema.safeParse("https://example.com/a.mp3").success).toBe(true);
  });

  it("nhận audioUrl dạng /api/audio/<id>", () => {
    expect(audioUrlSchema.safeParse("/api/audio/abc123").success).toBe(true);
  });

  it("từ chối audioUrl javascript:", () => {
    expect(audioUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });

  it("từ chối đường dẫn tương đối sai định dạng", () => {
    expect(audioUrlSchema.safeParse("/api/audio/").success).toBe(false);
    expect(RELATIVE_AUDIO_RE.test("/api/audio/ABC")).toBe(false);
  });
});
