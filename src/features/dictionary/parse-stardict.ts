import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

export type IdxEntry = { word: string; offset: number; size: number };

export function parseIdx(buf: Buffer): IdxEntry[] {
  const out: IdxEntry[] = [];
  let i = 0;
  while (i < buf.length) {
    const end = buf.indexOf(0, i);
    if (end === -1) break;
    if (end + 9 > buf.length) break;
    const word = buf.subarray(i, end).toString("utf8");
    const offset = buf.readUInt32BE(end + 1);
    const size = buf.readUInt32BE(end + 5);
    out.push({ word, offset, size });
    i = end + 9;
  }
  return out;
}

export function readDictFile(path: string): Buffer {
  const raw = readFileSync(path);
  return path.endsWith(".dz") ? gunzipSync(raw) : raw;
}

export type ParsedEntry = {
  headword: string;
  phonetic: string | null;
  pos: string | null;
  meaningVi: string;
  exampleEn: string | null;
  exampleVi: string | null;
};

export function parseEntry(text: string): ParsedEntry | null {
  // Một số mục StarDict dùng ký tự CR đơn lẻ (không đi kèm LF) làm dấu ngắt mềm bên
  // trong một dòng "-nghĩa" (ví dụ "zip code"). Thay các CR đơn lẻ này bằng khoảng
  // trắng trước khi tách dòng, để không lẫn ký tự điều khiển vào dữ liệu lưu.
  const normalized = text.replace(/\r(?!\n)/g, " ").replace(/[ \t]{2,}/g, " ");
  const lines = normalized.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const head = lines.find((l) => l.startsWith("@"));
  if (!head) return null;

  const m = /^@(.+?)(?:\s+\/(.+?)\/)?\s*$/.exec(head);
  if (!m) return null;
  const headword = m[1].trim();
  const phonetic = m[2]?.trim() ?? null;

  let pos: string | null = null;
  const meanings: string[] = [];
  let exampleEn: string | null = null;
  let exampleVi: string | null = null;

  for (const l of lines) {
    if (l.startsWith("*") && pos === null) {
      pos = l.slice(1).trim();
    } else if (l.startsWith("-")) {
      if (meanings.length < 3) {
        const meaning = l.slice(1).trim();
        if (meaning) meanings.push(meaning);
      }
    } else if (l.startsWith("=") && exampleEn === null) {
      const [en, vi] = l.slice(1).split("+");
      exampleEn = en.trim();
      exampleVi = vi?.trim() ?? null;
    }
  }
  if (meanings.length === 0) return null;
  return { headword, phonetic, pos, meaningVi: meanings.join("; "), exampleEn, exampleVi };
}
