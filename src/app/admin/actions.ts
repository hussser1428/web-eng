"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
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
  | { ok: true; questions: number; groups: number; examId: string | null }
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
    const r = await importQuestions(prisma, parsed.data, {
      // Checkbox không tích thì vắng mặt trong FormData; mặc định vào nháp để câu chưa duyệt không lên trang học.
      publish: formData.get("publish") !== null,
      examTitle: String(formData.get("examTitle") ?? "").trim() || undefined,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/questions");
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, issues: [dichLoiNhap((e as Error).message)] };
  }
}
