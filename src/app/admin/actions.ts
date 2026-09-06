"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getLlmProvider } from "@/lib/providers/llm";
import { requireAdmin } from "@/lib/require-admin";
import { getCertificate, getSection } from "@/features/certificates";
import { buildExam } from "@/features/admin/build-exam";
import { generateQuestions, MAX_COUNT } from "@/features/admin/generate-questions";
import { setExamStatus } from "@/features/admin/set-exam-status";
import { setQuestionStatus } from "@/features/admin/set-question-status";
import { updateQuestion } from "@/features/admin/update-question";
import { updateQuestionSchema } from "@/features/admin/update-question-schema";
import { importQuestions } from "@/features/questions/import-questions";
import { questionFileSchema } from "@/features/questions/import-schema";

/** Đăng hoặc gỡ hàng loạt câu hỏi đã tích chọn. Trả chuỗi thông báo cho `useActionState`. */
export async function setStatusAction(_prev: string | null, formData: FormData): Promise<string | null> {
  await requireAdmin("action");

  const status = formData.get("status");
  // Không đoán ý: giá trị lạ mà mặc định thành DRAFT thì sẽ gỡ nhầm cả loạt câu đang đăng.
  if (status !== "PUBLISHED" && status !== "DRAFT") return "Thao tác không hợp lệ.";

  const ids = formData.getAll("ids").map(String);
  if (ids.length === 0) return "Chưa chọn câu nào.";

  const r = await setQuestionStatus(prisma, { ids, status });
  revalidatePath("/admin/questions");

  const dau = status === "PUBLISHED" ? `Đã đăng ${r.updated} câu` : `Đã gỡ ${r.updated} câu`;
  return r.blocked.length > 0 ? `${dau}, ${r.blocked.length} câu Listening thiếu audio không đăng được.` : `${dau}.`;
}

const LOI_SUA: Record<string, string> = {
  NOT_FOUND: "Không tìm thấy câu hỏi.",
  INVALID_CHOICES: "Số lựa chọn không khớp phần thi.",
  INVALID_ANSWER: "Đáp án nằm ngoài danh sách lựa chọn.",
};

/** Ô trống trong form nghĩa là xoá giá trị cũ, nên trả `undefined` chứ không phải chuỗi rỗng. */
function chuoi(formData: FormData, ten: string): string | undefined {
  return String(formData.get(ten) ?? "").trim() || undefined;
}

/** Lưu một câu hỏi từ form sửa. Trả `null` khi xong, hoặc thông báo lỗi tiếng Việt. */
export async function updateQuestionAction(_prev: string | null, formData: FormData): Promise<string | null> {
  await requireAdmin("action");

  const id = String(formData.get("id") ?? "");
  if (!id) return "Thiếu mã câu hỏi.";

  // Radio không tích thì trường vắng mặt; Number(null) là 0 nên Zod vẫn nhận và sẽ đổi đáp án thành A.
  const answer = formData.get("answer");
  if (answer === null) return "Chưa chọn đáp án.";

  const parsed = updateQuestionSchema.safeParse({
    stem: chuoi(formData, "stem"),
    choices: formData.getAll("choices").map((c) => String(c).trim()),
    answer: Number(answer),
    explanation: String(formData.get("explanation") ?? "").trim(),
    skillTags: String(formData.get("skillTags") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    audioUrl: chuoi(formData, "audioUrl"),
    imageUrl: chuoi(formData, "imageUrl"),
    transcript: chuoi(formData, "transcript"),
  });
  if (!parsed.success) return "Dữ liệu không hợp lệ. Kiểm tra lại lựa chọn, giải thích và đường dẫn audio/ảnh.";

  try {
    await updateQuestion(prisma, id, parsed.data);
  } catch (e) {
    return LOI_SUA[(e as Error).message] ?? "Không lưu được câu hỏi.";
  }

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  return null;
}

export type ImportState =
  // `published` để form biết có link được sang /exam/[id] không: đề nháp thì trang đó trả 404.
  | { ok: true; questions: number; groups: number; examId: string | null; published: boolean }
  | { ok: false; issues: string[] };

/** Đổi mã lỗi của `importQuestions` sang một dòng tiếng Việt cho người nhập đọc. */
function dichLoiNhap(message: string): string {
  const ngan = message.indexOf(":");
  const ma = ngan < 0 ? message : message.slice(0, ngan);
  const chiTiet = ngan < 0 ? "" : message.slice(ngan + 1);
  if (ma === "UNKNOWN_CERTIFICATE") return "Chứng chỉ không hỗ trợ.";
  if (ma === "INVALID_SECTION") return `Phần thi không có trong chứng chỉ: ${chiTiet}.`;
  if (ma === "INVALID_CHOICES") return `Câu thứ ${Number(chiTiet) + 1} có số lựa chọn không khớp phần thi.`;
  if (ma === "UNKNOWN_GROUP") return `Câu hỏi trỏ tới nhóm chưa khai báo: ${chiTiet}.`;
  return `Không nhập được: ${message}`;
}

/** Nhập câu hỏi từ nội dung JSON dán hoặc tải lên. Mọi lỗi trả về thành danh sách dòng, không ném ra ngoài. */
export async function importAction(_prev: ImportState | null, formData: FormData): Promise<ImportState> {
  await requireAdmin("action");

  const text = String(formData.get("json") ?? "").trim();
  if (!text) return { ok: false, issues: ["Chưa có nội dung JSON."] };

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, issues: [`JSON không hợp lệ: ${(e as Error).message}`] };
  }

  const parsed = questionFileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }

  try {
    // Checkbox không tích thì vắng mặt trong FormData; mặc định vào nháp để câu chưa duyệt không lên trang học.
    const publish = formData.get("publish") !== null;
    const r = await importQuestions(prisma, parsed.data, {
      publish,
      examTitle: String(formData.get("examTitle") ?? "").trim() || undefined,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/questions");
    return { ok: true, ...r, published: publish };
  } catch (e) {
    return { ok: false, issues: [dichLoiNhap((e as Error).message)] };
  }
}

export type BuildExamState =
  | { ok: true; examId: string }
  | { ok: false; message: string; shortage?: Array<{ section: string; name: string; need: number; have: number }> };

/** Ghép một đề mới từ kho câu đã đăng. Thiếu câu thì trả bảng Part/cần/có chứ không tạo đề lệch. */
export async function buildExamAction(_prev: BuildExamState | null, formData: FormData): Promise<BuildExamState> {
  await requireAdmin("action");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, message: "Nhập tên đề." };

  const r = await buildExam(prisma, { title });
  if (!r.ok) {
    const cert = getCertificate("toeic");
    return {
      ok: false,
      message: "Chưa đủ câu đã đăng để ghép đề.",
      shortage: r.shortage.map((s) => ({ ...s, name: getSection(cert, s.section)?.name ?? s.section })),
    };
  }

  revalidatePath("/admin/exams");
  return { ok: true, examId: r.examId };
}

/** Đăng hoặc gỡ một đề. Giá trị lạ thì bỏ qua, không đoán ý. */
export async function setExamStatusAction(formData: FormData): Promise<void> {
  await requireAdmin("action");

  const id = String(formData.get("id") ?? "");
  const status = formData.get("status");
  if (!id || (status !== "PUBLISHED" && status !== "DRAFT")) return;

  await setExamStatus(prisma, { id, status });
  revalidatePath("/admin/exams");
  revalidatePath("/exam");
}

const LOI_SINH: Record<string, string> = {
  LLM_RATE_LIMITED: "Hết hạn mức, thử lại sau vài phút",
  LLM_BAD_JSON: "Model trả về JSON không hợp lệ, hãy thử lại",
  LLM_UNAVAILABLE: "Không gọi được LLM",
  UNSUPPORTED_SECTION: "Chỉ hỗ trợ Part 5, 6, 7",
};

const sinhSchema = z.object({
  // Part 1–4 cần audio/ảnh nên chưa sinh được; chặn ở đây thay vì để prompt ném lỗi.
  section: z.enum(["toeic.p5", "toeic.p6", "toeic.p7"]),
  count: z.coerce.number().int().min(1).max(MAX_COUNT),
  // Ô để trống gửi lên chuỗi rỗng, params của job cũ lưu `null`: cả hai đều nghĩa là không ghim kỹ năng.
  skillTag: z.string().trim().min(1).optional().catch(undefined),
});

/** Gọi LLM rồi đổi kết quả thành một dòng tiếng Việt. Dùng chung cho nút "Sinh" và nút "Chạy lại". */
async function chaySinh(createdById: string, input: z.infer<typeof sinhSchema>): Promise<string> {
  const llm = getLlmProvider();
  if (!llm) return "Chưa cấu hình LLM (LLM_API_KEY)";

  const r = await generateQuestions(prisma, llm, { ...input, createdById });

  // Làm mới cả khi thất bại: bảng lịch sử job đã có thêm dòng mới.
  revalidatePath("/admin/generate");
  revalidatePath("/admin/questions");
  revalidatePath("/admin");

  if (r.status === "FAILED") return LOI_SINH[r.error ?? ""] ?? `Sinh thất bại: ${r.error}`;
  return `Đã tạo ${r.resultCount} câu nháp`;
}

/** Sinh một lô câu hỏi bằng LLM, kết quả vào nháp. Trả chuỗi thông báo cho `useActionState`. */
export async function generateAction(_prev: string | null, formData: FormData): Promise<string | null> {
  const admin = await requireAdmin("action");

  const parsed = sinhSchema.safeParse({
    section: formData.get("section"),
    count: formData.get("count"),
    skillTag: formData.get("skillTag"),
  });
  if (!parsed.success) return "Chọn Part 5, 6 hoặc 7 và số câu từ 1 đến 10.";

  return chaySinh(admin.id, parsed.data);
}

/** Chạy lại một job hỏng bằng đúng tham số cũ (tạo job mới). Job lạ thì bỏ qua, không ném lỗi ra giao diện. */
export async function retryJobAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("action");

  const id = String(formData.get("jobId") ?? "");
  if (!id) return;

  const job = await prisma.generationJob.findUnique({ where: { id } });
  const parsed = sinhSchema.safeParse(job?.params);
  if (!parsed.success) return;

  await chaySinh(admin.id, parsed.data);
}
