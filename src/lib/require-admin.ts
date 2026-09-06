import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Bắt buộc người dùng hiện tại là ADMIN. Dùng ở đầu mỗi trang/action dưới `/admin`.
 * - `mode: "page"` (mặc định): không phải admin thì chuyển về trang chủ ("/").
 * - `mode: "action"`: không phải admin thì ném `Error("FORBIDDEN")` để route/Server Action trả lỗi.
 */
export async function requireAdmin(mode: "page" | "action" = "page"): Promise<{ id: string }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    if (mode === "action") throw new Error("FORBIDDEN");
    redirect("/");
  }
  return { id: session.user.id };
}
