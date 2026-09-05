import Link from "next/link";
import { auth } from "@/lib/auth";

const FEATURES = [
  { href: "/exam", emoji: "🎯", title: "Thi thử", desc: "Đề TOEIC Listening & Reading đầy đủ, có đồng hồ và chấm điểm.", accent: "hover:border-neon-violet/60 hover:shadow-[0_0_30px_rgba(139,92,246,0.25)]" },
  { href: "/drill", emoji: "⚡", title: "Luyện tập", desc: "Luyện theo từng Part, xem giải thích ngay sau mỗi câu.", accent: "hover:border-neon-pink/60 hover:shadow-[0_0_30px_rgba(236,72,153,0.25)]" },
  { href: "/vocab", emoji: "🧠", title: "Từ vựng", desc: "Ôn từ đã lưu theo lịch, trắc nghiệm Anh–Việt và Việt–Anh.", accent: "hover:border-neon-cyan/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.25)]" },
  { href: "/reading", emoji: "📖", title: "Đọc song ngữ", desc: "Truyện hài, cổ tích, anime, báo. Tiếng Anh và tiếng Việt cạnh nhau.", accent: "hover:border-amber-400/60 hover:shadow-[0_0_30px_rgba(251,191,36,0.25)]" },
];

export default async function Home() {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email;
  return (
    <div className="flex flex-col gap-12">
      <section className="relative overflow-hidden rounded-3xl border border-line px-6 py-10 md:px-10 md:py-16">
        <div className="glow -top-20 -left-10 h-72 w-72 bg-neon-violet" />
        <div className="glow -right-10 top-10 h-72 w-72 bg-neon-cyan" />
        <div className="relative max-w-3xl">
          <span className="inline-block rounded-full border border-line bg-white/5 px-3 py-1 text-xs font-semibold text-muted">
            ✨ Miễn phí · Không quảng cáo
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">
            {name ? (
              <>Chào <span className="text-neon">{name}</span>, học tiếp nào!</>
            ) : (
              <>Cày TOEIC <span className="text-neon">không nhàm chán</span></>
            )}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Thi thử, luyện tập theo Part, ôn từ vựng và đọc song ngữ. Bôi đen bất kỳ từ tiếng Anh nào để xem nghĩa ngay tại chỗ.
          </p>
          {!name && (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-neon rounded-full px-6 py-3 font-bold">
                Bắt đầu ngay 🚀
              </Link>
              <Link href="/login" className="rounded-full border border-line px-6 py-3 font-semibold text-foreground hover:bg-white/5">
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <Link key={f.href} href={f.href} className={`card group p-5 transition duration-200 hover:-translate-y-1 ${f.accent}`}>
            <div className="text-3xl" aria-hidden="true">{f.emoji}</div>
            <h2 className="mt-3 text-lg font-bold">{f.title}</h2>
            <p className="mt-1.5 text-sm text-muted">{f.desc}</p>
          </Link>
        ))}
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-bold">🔍 Thử popup dịch</h2>
        <p className="mt-2 leading-relaxed text-foreground/90">
          Bôi đen một từ hoặc một cụm trong câu sau: The committee will postpone the meeting until further notice. Bạn cũng có thể bôi đen tiếng Việt để dịch sang tiếng Anh.
        </p>
      </section>
    </div>
  );
}
