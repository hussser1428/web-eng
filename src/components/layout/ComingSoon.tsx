import Link from "next/link";

type Props = { title: string; description: string; emoji?: string };

export function ComingSoon({ title, description, emoji = "🚧" }: Props) {
  return (
    <section className="card relative mx-auto max-w-lg overflow-hidden p-8 text-center">
      <div className="glow -top-16 left-1/2 h-40 w-40 -translate-x-1/2 bg-neon-violet" />
      <div className="relative">
        <div className="text-5xl" aria-hidden="true">{emoji}</div>
        <span className="mt-4 inline-block rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-neon-cyan">
          Sắp có
        </span>
        <h1 className="mt-3 text-3xl font-extrabold">{title}</h1>
        <p className="mt-2 text-muted">{description}</p>
        <p className="mt-1 text-sm text-muted/70">Tính năng này đang được xây dựng.</p>
        <Link href="/" className="btn-neon mt-6 inline-block rounded-full px-5 py-2 text-sm font-semibold">
          Về trang chủ
        </Link>
      </div>
    </section>
  );
}
