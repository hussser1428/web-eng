"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { setQuestionStatus } from "@/features/admin/set-question-status";
import { updateQuestion } from "@/features/admin/update-question";
import { updateQuestionSchema } from "@/features/admin/update-question-schema";

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

  const parsed = updateQuestionSchema.safeParse({
    stem: chuoi(formData, "stem"),
    choices: formData.getAll("choices").map((c) => String(c).trim()),
    answer: Number(formData.get("answer")),
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
