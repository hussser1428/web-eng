// Dùng: npm run db:generate-content -- <questions|audio|readings|check|publish|exam|all>
import { PrismaClient } from "@prisma/client";
import { TARGETS, planBatches, readingSpecs } from "../../src/features/admin/seed-plan";
import { checkQuestion, checkReading } from "../../src/features/admin/content-check";
import { generateQuestions } from "../../src/features/admin/generate-questions";
import { generateReading } from "../../src/features/admin/generate-reading";
import { generateAudio, MAX_TTS_ITEMS } from "../../src/features/admin/tts/generate-audio";
import { listQuestions } from "../../src/features/admin/list-questions";
import { setQuestionStatus } from "../../src/features/admin/set-question-status";
import { setReadingStatus } from "../../src/features/reading/admin/set-reading-status";
import { buildExam } from "../../src/features/admin/build-exam";
import { setExamStatus } from "../../src/features/admin/set-exam-status";
import { getLlmProvider } from "../../src/lib/providers/llm";
import { getTtsProvider } from "../../src/lib/providers/tts";

// Prisma tự đọc `.env` cho DATABASE_URL, còn LLM_* thì không. Hai provider chỉ đọc
// `process.env` lúc gọi hàm nên nạp ở đây (sau phần import) vẫn kịp.
process.loadEnvFile?.(".env");

const prisma = new PrismaClient();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lỗi tạm thời của nhà cung cấp LLM — đáng chờ rồi thử lại. `LLM_BAD_JSON` thì không. */
const CO_THE_THU_LAI = new Set(["LLM_RATE_LIMITED", "LLM_UNAVAILABLE"]);

/** Chờ giữa hai lần gọi LLM cho đỡ chạm hạn mức. */
const NGHI_GIUA_LO_MS = 4_000;
const NGHI_KHI_QUA_TAI_MS = 30_000;

const nhan = (section: string) => `[${section.split(".")[1]?.toUpperCase() ?? section}]`;

/** Gọi `fn`; gặp lỗi tạm thời thì chờ 30 s rồi thử lại, tối đa 3 lần. */
async function thuLai<T extends { status: "DONE" | "FAILED"; error?: string }>(
  tag: string,
  fn: () => Promise<T>,
): Promise<T> {
  let r = await fn();
  for (let lan = 1; lan <= 3 && r.status === "FAILED" && CO_THE_THU_LAI.has(r.error ?? ""); lan++) {
    console.log(`${tag} ${r.error} — chờ 30 s rồi thử lại (${lan}/3)`);
    await sleep(NGHI_KHI_QUA_TAI_MS);
    r = await fn();
  }
  return r;
}

function cauHinhLlm() {
  const llm = getLlmProvider();
  if (!llm) {
    console.error("Chưa cấu hình LLM_API_KEY trong .env.");
    process.exit(1);
  }
  return llm;
}

/** Người tạo cho các job: admin đầu tiên, không có thì user đầu tiên. */
async function nguoiTao(): Promise<string> {
  const user = (await prisma.user.findFirst({ where: { role: "ADMIN" } })) ?? (await prisma.user.findFirst());
  if (!user) {
    console.error("Chưa có tài khoản nào — hãy đăng ký rồi chạy npm run db:make-admin.");
    process.exit(1);
  }
  return user.id;
}

async function questions() {
  const llm = cauHinhLlm();
  const createdById = await nguoiTao();

  for (const section of Object.keys(TARGETS)) {
    if (section === "toeic.p1") continue; // Part 1 cần ảnh, nhập bằng file
    const tag = nhan(section);
    const have = await prisma.question.count({ where: { section } });
    const los = planBatches(section, have);
    if (los.length === 0) {
      console.log(`${tag} đã đủ ${have}/${TARGETS[section]} câu.`);
      continue;
    }
    console.log(`${tag} có ${have}/${TARGETS[section]} câu — sinh ${los.length} lô.`);

    for (let i = 0; i < los.length; i++) {
      const count = los[i]!;
      const r = await thuLai(tag, () => generateQuestions(prisma, llm, { section, count, createdById }));
      if (r.status === "DONE") console.log(`${tag} lô ${i + 1}/${los.length}: ${r.resultCount} câu (job ${r.jobId})`);
      else console.error(`${tag} lô ${i + 1}/${los.length}: hỏng ${r.error} — bỏ lô (job ${r.jobId})`);
      await sleep(NGHI_GIUA_LO_MS);
    }
  }
}

async function audio() {
  const tts = getTtsProvider();
  const { items, total } = await listQuestions(prisma, { missingAudio: true, pageSize: 500 });

  // Một mục = một nhóm (Part 3/4 chung một file) hoặc một câu lẻ; mỗi mục lấy một câu đại diện.
  const daiDien = new Map<string, string>();
  for (const q of items) {
    const key = q.groupId ?? q.id;
    if (!daiDien.has(key)) daiDien.set(key, q.id);
  }
  const ids = [...daiDien.values()];
  if (ids.length === 0) {
    console.log("[TTS] không còn câu nào thiếu audio.");
    return;
  }

  const soLo = Math.ceil(ids.length / MAX_TTS_ITEMS);
  console.log(`[TTS] ${items.length}/${total} câu thiếu audio → ${ids.length} mục, ${soLo} lô.`);
  if (total > items.length) console.log(`[TTS] còn ${total - items.length} câu ngoài trang này — chạy lại lệnh để làm tiếp.`);

  for (let i = 0; i < ids.length; i += MAX_TTS_ITEMS) {
    const lo = ids.slice(i, i + MAX_TTS_ITEMS);
    const stt = Math.floor(i / MAX_TTS_ITEMS) + 1;
    try {
      const r = await generateAudio(prisma, tts, { ids: lo });
      console.log(`[TTS] lô ${stt}/${soLo}: xong ${r.done}, bỏ qua ${r.skipped}, hỏng ${r.failed}`);
      for (const e of r.errors) console.error(`  ${e}`);
    } catch (e) {
      console.error(`[TTS] lô ${stt}/${soLo}: ${e instanceof Error ? e.message : e}`);
    }
  }
}

async function readings() {
  const llm = cauHinhLlm();
  const createdById = await nguoiTao();

  const have = await prisma.reading.count();
  const specs = readingSpecs(20).slice(have);
  if (specs.length === 0) {
    console.log(`[Đọc] đã có ${have} bài.`);
    return;
  }
  console.log(`[Đọc] có ${have}/20 bài — sinh thêm ${specs.length}.`);

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i]!;
    const mo = `${spec.genre}/${spec.level}/${spec.length}`;
    const r = await thuLai("[Đọc]", () => generateReading(prisma, llm, { ...spec, createdById }));
    if (r.status === "DONE") console.log(`[Đọc] bài ${i + 1}/${specs.length} (${mo}): ${r.title} (job ${r.jobId})`);
    else console.error(`[Đọc] bài ${i + 1}/${specs.length} (${mo}): hỏng ${r.error} (job ${r.jobId})`);
    await sleep(NGHI_GIUA_LO_MS);
  }
}

/**
 * `MISSING_AUDIO` không phải lỗi nội dung: bước `audio` tạo audio sau, và `setQuestionStatus`
 * tự chặn không cho đăng. Nên câu chỉ thiếu audio thì không xoá, không loại khỏi danh sách đăng.
 */
const loiThat = (errors: string[]) => errors.filter((e) => e !== "MISSING_AUDIO");

/** Chạy `checkQuestion`/`checkReading` trên toàn bộ kho, trả về những bản ghi có lỗi. */
async function soatLoi() {
  const cau = await prisma.question.findMany({ include: { group: true } });
  const bai = await prisma.reading.findMany({ include: { sentences: true } });

  const cauLoi = cau
    .map((q) => ({ q, errors: checkQuestion({ ...q, choices: q.choices as string[] }) }))
    .filter((x) => x.errors.length > 0);
  const baiLoi = bai.map((r) => ({ r, errors: checkReading(r) })).filter((x) => x.errors.length > 0);

  return { cau, bai, cauLoi, baiLoi };
}

async function check() {
  const { cau, bai, cauLoi, baiLoi } = await soatLoi();
  console.log(`Đã soát ${cau.length} câu, ${bai.length} bài đọc.`);

  if (cauLoi.length > 0) {
    console.log("\nid | section | lỗi");
    for (const { q, errors } of cauLoi) console.log(`${q.id} | ${q.section} | ${errors.join(", ")}`);
  }
  if (baiLoi.length > 0) {
    console.log("\nid | title | lỗi");
    for (const { r, errors } of baiLoi) console.log(`${r.id} | ${r.title} | ${errors.join(", ")}`);
  }
  if (cauLoi.length === 0 && baiLoi.length === 0) {
    console.log("Không có lỗi.");
    return;
  }

  if (!process.argv.includes("--delete-bad")) {
    console.error(
      `\n${cauLoi.length} câu và ${baiLoi.length} bài có lỗi. Thêm --delete-bad để xoá bản nháp lỗi thật (chỉ thiếu audio thì giữ).`,
    );
    process.exitCode = 1;
    return;
  }

  // Chỉ xoá bản nháp có lỗi thật: nội dung đã đăng là do admin duyệt, thiếu audio thì đợi bước `audio`.
  const cauXoa = cauLoi.filter((x) => x.q.status === "DRAFT" && loiThat(x.errors).length > 0);
  const baiXoa = baiLoi.filter((x) => x.r.status === "DRAFT");
  const giuLai = cauLoi.length - cauXoa.length + (baiLoi.length - baiXoa.length);

  // Câu thuộc nhóm thì xoá cả nhóm: `Question.group` là SetNull nên phải xoá câu trước rồi mới xoá nhóm.
  // Nhóm nào còn câu đã đăng thì để nguyên, tránh xoá lây sang nội dung đã duyệt.
  const nhomLoi = [...new Set(cauXoa.map((x) => x.q.groupId).filter((id): id is string => Boolean(id)))];
  const nhomXoa = nhomLoi.filter((id) => !cau.some((q) => q.groupId === id && q.status !== "DRAFT"));

  let soCau = 0;
  for (const groupId of nhomXoa) {
    soCau += (await prisma.question.deleteMany({ where: { groupId } })).count;
    await prisma.questionGroup.delete({ where: { id: groupId } });
  }
  const cauLe = cauXoa.filter((x) => !x.q.groupId).map((x) => x.q.id);
  soCau += (await prisma.question.deleteMany({ where: { id: { in: cauLe } } })).count;
  const soBai = (await prisma.reading.deleteMany({ where: { id: { in: baiXoa.map((x) => x.r.id) } } })).count;

  console.log(`\nĐã xoá ${soCau} câu (${nhomXoa.length} nhóm) và ${soBai} bài đọc.`);
  if (giuLai > 0) console.log(`Giữ lại ${giuLai} bản ghi: đã đăng hoặc chỉ thiếu audio.`);
  if (nhomXoa.length < nhomLoi.length) {
    console.log(`Giữ lại ${nhomLoi.length - nhomXoa.length} nhóm còn câu đã đăng.`);
  }
}

async function publish() {
  const { cau, bai, cauLoi, baiLoi } = await soatLoi();
  // Câu chỉ thiếu audio vẫn gửi lên: `setQuestionStatus` tự chặn và trả về trong `blocked`.
  const cauXau = new Set(cauLoi.filter((x) => loiThat(x.errors).length > 0).map((x) => x.q.id));
  const baiXau = new Set(baiLoi.map((x) => x.r.id));

  const ids = cau.filter((q) => q.status === "DRAFT" && !cauXau.has(q.id)).map((q) => q.id);
  const r = await setQuestionStatus(prisma, { ids, status: "PUBLISHED" });
  console.log(`Câu: đăng ${r.updated}, chặn ${r.blocked.length} (thiếu audio), bỏ ${cauXau.size} câu lỗi.`);

  let soBai = 0;
  for (const b of bai.filter((x) => x.status === "DRAFT" && !baiXau.has(x.id))) {
    await setReadingStatus(prisma, { id: b.id, status: "PUBLISHED" });
    soBai++;
  }
  console.log(`Bài đọc: đăng ${soBai}, bỏ ${baiLoi.length} bài lỗi.`);
}

async function exam() {
  const title = process.argv[3] ?? "Đề thi thử 1";
  const r = await buildExam(prisma, { title });
  if (!r.ok) {
    console.error("Không đủ câu đã đăng để ghép đề:");
    console.error("Part | cần | có");
    for (const s of r.shortage) console.error(`${s.section} | ${s.need} | ${s.have}`);
    process.exitCode = 1;
    return;
  }
  await setExamStatus(prisma, { id: r.examId, status: "PUBLISHED" });
  console.log(`Đã tạo và đăng đề "${title}": ${r.examId}`);
}

const CACH_DUNG = `Cách dùng: npm run db:generate-content -- <lệnh>

  questions          sinh câu hỏi Part 2-7 cho đủ chỉ tiêu
  audio              tạo audio cho câu Listening còn thiếu
  readings           sinh bài đọc song ngữ cho đủ 20 bài
  check              soát lỗi nội dung; --delete-bad xoá bản nháp lỗi thật
                     (MISSING_AUDIO không tính là lỗi, bản đã đăng không xoá)
  publish            đăng mọi câu/bài nháp không lỗi; câu thiếu audio bị chặn lại
  exam ["Tên đề"]    ghép và đăng một đề thi
  all                questions → audio → readings → check (không đăng)`;

async function main() {
  try {
    switch (process.argv[2]) {
      case "questions":
        return await questions();
      case "audio":
        return await audio();
      case "readings":
        return await readings();
      case "check":
        return await check();
      case "publish":
        return await publish();
      case "exam":
        return await exam();
      case "all":
        await questions();
        await audio();
        await readings();
        return await check();
      default:
        console.error(CACH_DUNG);
        process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
