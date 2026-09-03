import { existsSync, readFileSync } from "node:fs";
import { PrismaClient, Prisma } from "@prisma/client";
import { parseIdx, readDictFile, parseEntry } from "../../src/features/dictionary/parse-stardict";
import { normalizeHeadword } from "../../src/features/dictionary/normalize";

const prisma = new PrismaClient();

async function main() {
  const base = process.argv[2];
  if (!base) throw new Error("Cách dùng: npm run db:import-dict -- <path-khong-duoi>");
  const idxPath = `${base}.idx`;
  const dictPath = existsSync(`${base}.dict.dz`) ? `${base}.dict.dz` : `${base}.dict`;
  const idx = parseIdx(readFileSync(idxPath));
  const dict = readDictFile(dictPath);
  console.log(`Đọc ${idx.length} mục từ ${idxPath}`);

  const seen = new Set<string>();
  let batch: Prisma.WordCreateManyInput[] = [];
  let inserted = 0;

  for (const e of idx) {
    const text = dict.subarray(e.offset, e.offset + e.size).toString("utf8");
    const parsed = parseEntry(text);
    if (!parsed) continue;

    // Headword luôn lấy từ mục .idx (không dùng parsed.headword): một số mục thật sự
    // chỉ bắt đầu bằng dòng "@Chuyên ngành ..." (không có dòng "@<headword>" thật), nên
    // dòng "@" đầu tiên mà parseEntry đọc được không phải là headword đúng. Từ .idx luôn
    // đúng vì đó là key StarDict dùng để tra cứu.
    const headword = normalizeHeadword(e.word);
    if (!headword || headword.length > 100) continue;
    if (seen.has(headword)) continue;
    seen.add(headword);

    batch.push({
      headword,
      phonetic: parsed.phonetic,
      pos: parsed.pos,
      meaningVi: parsed.meaningVi,
      exampleEn: parsed.exampleEn,
      exampleVi: parsed.exampleVi,
    });
    if (batch.length >= 2000) {
      const r = await prisma.word.createMany({ data: batch, skipDuplicates: true });
      inserted += r.count;
      batch = [];
      process.stdout.write(`\rĐã chèn ${inserted}`);
    }
  }
  if (batch.length) {
    const r = await prisma.word.createMany({ data: batch, skipDuplicates: true });
    inserted += r.count;
  }
  console.log(`\nXong. Tổng chèn: ${inserted}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
