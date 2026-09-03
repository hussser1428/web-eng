import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">TOEIC Prep</h1>
      {session?.user ? (
        <div className="mt-4 flex items-center gap-3">
          <span>Xin chào, {session.user.name ?? session.user.email}</span>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button className="rounded border px-3 py-1">Đăng xuất</button>
          </form>
        </div>
      ) : (
        <p className="mt-4">
          <Link href="/login" className="text-blue-600 underline">Đăng nhập</Link> hoặc{" "}
          <Link href="/register" className="text-blue-600 underline">đăng ký</Link>
        </p>
      )}
      <p className="mt-8 text-gray-700">
        Bôi đen bất kỳ từ tiếng Anh nào trên trang để xem nghĩa. Ví dụ: The committee will postpone the meeting until further notice.
      </p>
    </main>
  );
}
