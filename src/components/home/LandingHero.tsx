import Link from "next/link";
import { Target, Zap, BrainCircuit, BookOpen, ArrowRight, Search } from "lucide-react";

const FEATURES = [
  { href: "/exam", Icon: Target, title: "Thi thử", desc: "Đề TOEIC Listening & Reading đầy đủ, có đồng hồ và chấm điểm." },
  { href: "/drill", Icon: Zap, title: "Luyện tập", desc: "Luyện theo từng Part, xem giải thích ngay sau mỗi câu." },
  { href: "/vocab", Icon: BrainCircuit, title: "Từ vựng", desc: "Ôn từ đã lưu theo lịch, trắc nghiệm Anh–Việt và Việt–Anh." },
  { href: "/reading", Icon: BookOpen, title: "Đọc song ngữ", desc: "Truyện hài, cổ tích, anime, báo. Tiếng Anh và tiếng Việt cạnh nhau." },
];

export function LandingHero() {
  return (
    <div className="flex flex-col gap-12">
      <section className="rounded-2xl border border-line bg-surface px-6 py-10 backdrop-blur-md md:px-10 md:py-16">
        <div className="max-w-3xl">
          <span className="inline-block rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
            Miễn phí · Không quảng cáo
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">
            Cày TOEIC <span className="text-accent">không nhàm chán</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Thi thử, luyện tập theo Part, ôn từ vựng và đọc song ngữ. Bôi đen bất kỳ từ tiếng Anh nào để xem nghĩa ngay tại chỗ.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold">
              Bắt đầu ngay
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/login" className="rounded-lg border border-line px-6 py-3 font-medium text-foreground hover:bg-surface-2">
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ href, Icon, title, desc }) => (
          <Link key={href} href={href} className="card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-accent/60">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent-text">
              <Icon size={20} aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-lg font-bold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted">{desc}</p>
          </Link>
        ))}
      </section>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Search size={18} className="text-accent-text" aria-hidden="true" />
          Thử popup dịch
        </h2>
        <p className="mt-2 leading-relaxed text-foreground/90">
          Bôi đen một từ hoặc một cụm trong câu sau: The committee will postpone the meeting until further notice. Bạn cũng có thể bôi đen tiếng Việt để dịch sang tiếng Anh.
        </p>
      </section>
    </div>
  );
}
