/** Shared minimal shell for partner confirmation pages — no dashboards, just one clear card. */
export default function PartnerCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-x flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-ink-soft/40 p-8">
        <p className="text-xs uppercase tracking-widest text-gold">Montreal Spider Co. — Partner</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-cream">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
