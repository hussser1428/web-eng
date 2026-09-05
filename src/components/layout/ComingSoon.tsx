import Link from "next/link";

type Props = { title: string; description: string };

export function ComingSoon({ title, description }: Props) {
  return (
    <section className="mx-auto max-w-lg rounded-xl border border-blue-100 bg-white p-8 text-center shadow-sm">
      <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
        Sắp có
      </span>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{description}</p>
      <p className="mt-1 text-sm text-slate-500">Tính năng này đang được xây dựng.</p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
        Về trang chủ
      </Link>
    </section>
  );
}
