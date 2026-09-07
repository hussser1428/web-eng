import { describe, it, expect } from "vitest";
import { splitTranscript } from "./segments";

describe("splitTranscript", () => {
  it("Part 3 tách M/W theo dòng", () => {
    const transcript = "M: Where is the meeting?\nW: It's in room 204.";
    expect(splitTranscript("toeic.p3", transcript)).toEqual([
      { speaker: "M", text: "Where is the meeting?" },
      { speaker: "W", text: "It's in room 204." },
    ]);
  });

  it("nhận Man:/Woman: và không phân biệt hoa thường", () => {
    const transcript = "man: Hi\nWOMAN: Hello\nm: Bye";
    expect(splitTranscript("toeic.p3", transcript)).toEqual([
      { speaker: "M", text: "Hi" },
      { speaker: "W", text: "Hello" },
      { speaker: "M", text: "Bye" },
    ]);
  });

  it("Part 2 Q là M, A/B/C là W và đọc chữ cái", () => {
    const transcript = "Q: What time is it?\nA: Two o'clock.\nB: In the morning.\nC: Yes, it is.";
    expect(splitTranscript("toeic.p2", transcript)).toEqual([
      { speaker: "M", text: "What time is it?" },
      { speaker: "W", text: "A. Two o'clock." },
      { speaker: "W", text: "B. In the morning." },
      { speaker: "W", text: "C. Yes, it is." },
    ]);
  });

  it("Part 4 không tiền tố là N", () => {
    const transcript = "Attention all passengers.\nThe train will depart shortly.";
    expect(splitTranscript("toeic.p4", transcript)).toEqual([
      { speaker: "N", text: "Attention all passengers." },
      { speaker: "N", text: "The train will depart shortly." },
    ]);
  });

  it("A/B/C/D ở Part 1 là N", () => {
    const transcript = "A: A man is typing.\nD: A woman is reading.";
    expect(splitTranscript("toeic.p1", transcript)).toEqual([
      { speaker: "N", text: "A. A man is typing." },
      { speaker: "N", text: "D. A woman is reading." },
    ]);
  });

  it("bỏ dòng trắng", () => {
    const transcript = "M: Hello\n\n   \nW: Hi";
    expect(splitTranscript("toeic.p3", transcript)).toEqual([
      { speaker: "M", text: "Hello" },
      { speaker: "W", text: "Hi" },
    ]);
    expect(splitTranscript("toeic.p3", "")).toEqual([]);
  });
});
