type Props = { title: string; subtitle?: string; children: React.ReactNode };

export function AuthCard({ title, subtitle, children }: Props) {
  return (
    <div className="relative mx-auto max-w-sm" data-no-translate>
      <div className="card relative p-7">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {subtitle && <p className="mt-1 mb-5 text-sm text-muted">{subtitle}</p>}
        {!subtitle && <div className="mb-5" />}
        {children}
      </div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";
export const labelClass = "text-sm font-medium text-muted";
export const primaryButtonClass = "btn-primary w-full rounded-xl px-4 py-2.5 font-bold disabled:opacity-50";
export const secondaryButtonClass = "w-full rounded-xl border border-line px-4 py-2.5 font-medium text-foreground hover:bg-surface-2";
