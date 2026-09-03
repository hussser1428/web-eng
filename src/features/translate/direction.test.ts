import { describe, it, expect } from "vitest";
import { detectDirection } from "./direction";

describe("detectDirection", () => {
  it("có dấu tiếng Việt thì vi -> en", () => {
    expect(detectDirection("hoãn cuộc họp")).toEqual({ from: "vi", to: "en" });
    expect(detectDirection("Đường")).toEqual({ from: "vi", to: "en" });
  });
  it("không dấu thì en -> vi", () => {
    expect(detectDirection("postpone the meeting")).toEqual({ from: "en", to: "vi" });
  });
});
