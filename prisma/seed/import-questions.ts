// Dùng: npm run db:import-questions -- prisma/seed/fixtures/questions-sample.json [--exam "Đề mẫu 1"] [--draft]
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { questionFileSchema } from "../../src/features/questions/import-schema";
import { importQuestions } from "../../src/features/questions/import-questions";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--exam");
  if (!file) {
    console.error('Cách dùng: npm run db:import-questions -- <file.json> [--exam "Tên đề"] [--draft]');
    process.exit(1);
  }
  const examIdx = args.indexOf("--exam");
  const examTitle = examIdx >= 0 ? args[examIdx + 1] : undefined;
  const publish = !args.includes("--draft");

  const raw = JSON.parse(await readFile(file, "utf8"));
  const parsed = questionFileSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("File không hợp lệ:");
    for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const r = await importQuestions(prisma, parsed.data, { publish, examTitle });
    console.log(`Đã nhập ${r.questions} câu, ${r.groups} nhóm${r.examId ? `, tạo đề ${r.examId}` : ""} (${publish ? "PUBLISHED" : "DRAFT"}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
