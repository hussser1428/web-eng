type Props = { title: string; children: React.ReactNode };

export function AuthCard({ title, children }: Props) {
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm" data-no-translate>
      <h1 className="mb-5 text-2xl font-bold text-slate-900">{title}</h1>
      {children}
    </div>
  );
}

export const inputClass = "w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
export const labelClass = "text-sm font-medium text-slate-700";
export const primaryButtonClass = "w-full rounded-md bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50";
export const secondaryButtonClass = "w-full rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50";
