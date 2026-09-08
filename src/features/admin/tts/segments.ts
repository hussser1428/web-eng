import type { SpeakerKind } from "./voices";

export type Segment = { speaker: SpeakerKind; text: string };

const PREFIX_RE = /^(man|woman|m|w|q|a|b|c|d):\s*(.*)$/i;

/**
 * Mỗi dòng một lượt nói. Tiền tố (không phân biệt hoa thường):
 *  - "M:" / "Man:" → speaker "M"
 *  - "W:" / "Woman:" → speaker "W"
 *  - "Q:" → speaker "M" (câu hỏi Part 2)
 *  - "A:".."D:" → text = "<CHỮ CÁI>. <phần sau>"; speaker "W" ở Part 2 (`section === "toeic.p2"`), ngược lại "N"
 *  - không tiền tố → speaker "N", text là cả dòng đã trim
 * Bỏ dòng trắng. Trả [] khi transcript rỗng.
 */
export function splitTranscript(section: string, transcript: string): Segment[] {
  const segments: Segment[] = [];
  for (const raw of transcript.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const m = line.match(PREFIX_RE);
    if (!m) {
      segments.push({ speaker: "N", text: line });
      continue;
    }

    const prefix = m[1].toLowerCase();
    const rest = m[2];
    if (prefix === "m" || prefix === "man") segments.push({ speaker: "M", text: rest });
    else if (prefix === "w" || prefix === "woman") segments.push({ speaker: "W", text: rest });
    else if (prefix === "q") segments.push({ speaker: "M", text: rest });
    else segments.push({ speaker: section === "toeic.p2" ? "W" : "N", text: `${prefix.toUpperCase()}. ${rest}` });
  }
  return segments;
}
