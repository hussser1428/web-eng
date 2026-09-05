import Link from "next/link";
import { Construction, type LucideIcon } from "lucide-react";

type Props = { title: string; description: string; icon?: LucideIcon };

export function ComingSoon({ title, description, icon: Icon = Construction }: Props) {
  return (
    <section className="card mx-auto max-w-lg p-8 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent-text">
        <Icon size={24} aria-hidden="true" />
      </span>
      <p className="mt-4">
        <span className="inline-block rounded-full border border-info/40 bg-info/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-info">
          Sắp có
        </span>
      </p>
      <h1 className="mt-3 text-3xl font-extrabold">{title}</h1>
      <p className="mt-2 text-muted">{description}</p>
      <p className="mt-1 text-sm text-muted/70">Tính năng này đang được xây dựng.</p>
      <Link href="/" className="btn-primary mt-6 inline-block rounded-lg px-5 py-2 text-sm font-semibold">
        Về trang chủ
      </Link>
    </section>
  );
}
