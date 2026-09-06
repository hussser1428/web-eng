"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { setQuestionStatus } from "@/features/admin/set-question-status";

/** Đăng hoặc gỡ hàng loạt câu hỏi đã tích chọn. Trả chuỗi thông báo cho `useActionState`. */
export async function setStatusAction(_prev: string | null, formData: FormData): Promise<string | null> {
  await requireAdmin("action");

  const ids = formData.getAll("ids").map(String);
  if (ids.length === 0) return "Chưa chọn câu nào.";
  const status = formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

  const r = await setQuestionStatus(prisma, { ids, status });
  revalidatePath("/admin/questions");

  const dau = status === "PUBLISHED" ? `Đã đăng ${r.updated} câu` : `Đã gỡ ${r.updated} câu`;
  return r.blocked.length > 0 ? `${dau}, ${r.blocked.length} câu Listening thiếu audio không đăng được.` : `${dau}.`;
}
