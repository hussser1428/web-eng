import Link from "next/link";
import { auth } from "@/lib/auth";

const FEATURES = [
  { href: "/exam", title: "Thi thử", desc: "Làm đề TOEIC Listening & Reading đầy đủ, có đồng hồ và chấm điểm." },
  { href: "/drill", title: "Luyện tập", desc: "Luyện theo từng Part, xem giải thích ngay sau mỗi câu." },
  { href: "/vocab", title: "Từ vựng", desc: "Ôn từ đã lưu theo lịch, trắc nghiệm Anh–Việt và Việt–Anh." },
  { href: "/reading", title: "Đọc song ngữ", desc: "Truyện hài, cổ tích, anime, báo. Tiếng Anh và tiếng Việt cạnh nhau." },
];

export default async function Home() {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email;
  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-10 text-white shadow-md md:px-10">
        <h1 className="text-3xl font-bold md:text-4xl">{name ? `Xin chào, ${name}!` : "Luyện thi TOEIC mỗi ngày"}</h1>
        <p className="mt-3 max-w-2xl text-blue-100">
          Thi thử, luyện tập theo Part, ôn từ vựng và đọc song ngữ. Bôi đen bất kỳ từ tiếng Anh nào trên trang để xem nghĩa ngay.
        </p>
        {!name && (
          <div className="mt-6 flex gap-3">
            <Link href="/register" className="rounded-md bg-white px-5 py-2.5 font-semibold text-blue-700 hover:bg-blue-50">
              Đăng ký miễn phí
            </Link>
            <Link href="/login" className="rounded-md border border-blue-200 px-5 py-2.5 font-semibold text-white hover:bg-blue-600">
              Đăng nhập
            </Link>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <Link key={f.href} href={f.href} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700">{f.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Thử popup dịch</h2>
        <p className="mt-2 text-slate-700">
          Bôi đen một từ hoặc một cụm trong câu sau: The committee will postpone the meeting until further notice. Bạn cũng có thể bôi đen tiếng Việt để dịch sang tiếng Anh.
        </p>
      </section>
    </div>
  );
}
