import { describe, it, expect } from "vitest";
import { parseIdx, parseEntry } from "./parse-stardict";

function idxOf(entries: { word: string; offset: number; size: number }[]): Buffer {
  const parts: Buffer[] = [];
  for (const e of entries) {
    const w = Buffer.from(e.word, "utf8");
    const nums = Buffer.alloc(8);
    nums.writeUInt32BE(e.offset, 0);
    nums.writeUInt32BE(e.size, 4);
    parts.push(w, Buffer.from([0]), nums);
  }
  return Buffer.concat(parts);
}

describe("parseIdx", () => {
  it("đọc word, offset, size big-endian", () => {
    const buf = idxOf([
      { word: "abandon", offset: 0, size: 120 },
      { word: "ability", offset: 120, size: 50 },
    ]);
    expect(parseIdx(buf)).toEqual([
      { word: "abandon", offset: 0, size: 120 },
      { word: "ability", offset: 120, size: 50 },
    ]);
  });

  it("bỏ qua mục bị cắt cụt ở cuối buffer", () => {
    // Build valid idx for one entry, then append truncated entry
    const validBuf = idxOf([
      { word: "abandon", offset: 0, size: 120 },
    ]);
    // Append second word + NUL + only 3 bytes (instead of 8)
    const truncatedEntry = Buffer.concat([
      Buffer.from("ability"),
      Buffer.from([0]),
      Buffer.alloc(3), // Only 3 bytes instead of required 8
    ]);
    const buf = Buffer.concat([validBuf, truncatedEntry]);

    // Should return only the first entry without throwing
    expect(parseIdx(buf)).toEqual([
      { word: "abandon", offset: 0, size: 120 },
    ]);
  });
});

describe("parseEntry", () => {
  const text = `@abandon /ə'bændən/
* danh từ
- sự phóng túng, sự tự do
* ngoại động từ
- bỏ, từ bỏ
=to abandon oneself to despair+ chán nản, thất vọng`;

  it("lấy headword, phonetic, pos đầu, nghĩa đầu, ví dụ", () => {
    expect(parseEntry(text)).toEqual({
      headword: "abandon",
      phonetic: "ə'bændən",
      pos: "danh từ",
      meaningVi: "sự phóng túng, sự tự do; bỏ, từ bỏ",
      exampleEn: "to abandon oneself to despair",
      exampleVi: "chán nản, thất vọng",
    });
  });

  it("không có phonetic và ví dụ", () => {
    expect(parseEntry("@zip code\n* danh từ\n- mã bưu điện")).toEqual({
      headword: "zip code",
      phonetic: null,
      pos: "danh từ",
      meaningVi: "mã bưu điện",
      exampleEn: null,
      exampleVi: null,
    });
  });

  it("không có nghĩa thì trả null", () => {
    expect(parseEntry("@foo\n* danh từ")).toBeNull();
  });

  it("giới hạn tối đa 3 nghĩa", () => {
    const t = "@x\n* n\n- a\n- b\n- c\n- d";
    expect(parseEntry(t)?.meaningVi).toBe("a; b; c");
  });
});
