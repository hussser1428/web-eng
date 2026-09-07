// Dùng: npm run db:import-reading -- prisma/seed/fixtures/reading-sample.json [--draft]
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { readingFileSchema } from "../../src/features/reading/import-schema";
import { importReading } from "../../src/features/reading/import-reading";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("Cách dùng: npm run db:import-reading -- <file.json> [--draft]");
    process.exit(1);
  }
  const publish = !args.includes("--draft");

  const raw = JSON.parse(await readFile(file, "utf8"));
  const parsed = readingFileSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("File không hợp lệ:");
    for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const r = await importReading(prisma, parsed.data, { publish });
    console.log(`Đã nhập bài "${parsed.data.title}" (${r.sentences} câu, ${publish ? "PUBLISHED" : "DRAFT"}).`);
    console.log(`id=${r.readingId}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
