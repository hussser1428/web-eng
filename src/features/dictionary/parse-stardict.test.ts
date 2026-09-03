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

  it("mẫu thực tế: abandon với '*  x' (2 khoảng trắng), '-x' không khoảng trắng, khối @Chuyên ngành", () => {
    const text = `@abandon /ə'bændən/
*  ngoại động từ
- bộm (nhiếp ảnh) từ bỏ; bỏ rơi, ruồng bỏ
=to abandon a hope+ từ bỏ hy vọng
*  danh từ
- sự phóng túng, sự tự do, sự buông thả
@Chuyên ngành kinh tế
-bỏ phế
-từ bỏ
@Chuyên ngành kỹ thuật
-bỏ`;
    const parsed = parseEntry(text);
    expect(parsed?.pos).toBe("ngoại động từ");
    expect(parsed?.meaningVi).toBe(
      "bộm (nhiếp ảnh) từ bỏ; bỏ rơi, ruồng bỏ; sự phóng túng, sự tự do, sự buông thả; bỏ phế"
    );
    expect(parsed?.exampleEn).toBe("to abandon a hope");
    expect(parsed?.exampleVi).toBe("từ bỏ hy vọng");
  });

  it("mẫu thực tế: 'zip code' với phonetic dạng [...] và '*danh từ' không khoảng trắng", () => {
    const text = `@zip code ['zip'coud]
*danh từ
-  chỉ số bưu điện (để chọn thư cho nhanh)
@Chuyên ngành kinh tế
-mã hộp thư (ở Mỹ)`;
    const parsed = parseEntry(text);
    // Regex không đổi: phonetic dạng [...] không khớp /\/(.+?)\//, nên toàn bộ phần còn lại
    // (kể cả dấu ngoặc vuông) rơi vào headword và phonetic ở lại null. Không sao vì script
    // nhập luôn dùng normalizeHeadword(idxWord) làm headword thật, bỏ qua parsed.headword.
    expect(parsed?.headword).toBe("zip code ['zip'coud]");
    expect(parsed?.phonetic).toBeNull();
    expect(parsed?.pos).toBe("danh từ");
    expect(parsed?.meaningVi).toBe(
      "chỉ số bưu điện (để chọn thư cho nhanh); mã hộp thư (ở Mỹ)"
    );
  });

  it("mẫu thực tế: mục chỉ có dòng @Chuyên ngành (không có headword thật) vẫn parse được nghĩa; headword lấy từ dòng @ (sai) nhưng script sẽ ghi đè bằng từ trong idx", () => {
    const text = `@Chuyên ngành kinh tế
-giấy phép "A"
-môn bài "A"`;
    const parsed = parseEntry(text);
    expect(parsed?.headword).toBe("Chuyên ngành kinh tế");
    expect(parsed?.meaningVi).toBe('giấy phép "A"; môn bài "A"');
  });

  it("dòng '-x' không khoảng trắng được tính là nghĩa", () => {
    const t = "@x\n* n\n-a\n-b";
    expect(parseEntry(t)?.meaningVi).toBe("a; b");
  });

  it("dòng '*x' không khoảng trắng được tính là pos", () => {
    const t = "@x\n*n\n- a";
    expect(parseEntry(t)?.pos).toBe("n");
  });

  it("CR đơn lẻ (không phải \\r\\n) trong dòng nghĩa được thay bằng khoảng trắng, không lẫn vào dữ liệu", () => {
    const t = "@zip code ['zip'coud]\n*danh từ\n-  chỉ số bưu điện (để chọn thư cho nhanh)\r ( viết-tắt của Zone Improvement Program Code )";
    const parsed = parseEntry(t);
    expect(parsed?.meaningVi).toBe(
      "chỉ số bưu điện (để chọn thư cho nhanh) ( viết-tắt của Zone Improvement Program Code )"
    );
    expect(parsed?.meaningVi).not.toContain("\r");
  });
});
