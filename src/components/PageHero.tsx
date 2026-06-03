import Reveal from "./Reveal";

export default function PageHero({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="web-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -right-32 top-0 h-72 w-72 rounded-full bg-gold/5 blur-3xl" />
      <div className="container-x relative py-14 md:py-20">
        <Reveal>
          {kicker && <p className="badge mb-4">{kicker}</p>}
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight text-cream md:text-6xl">
            <span className="text-gradient-gold">{title}</span>
          </h1>
          {subtitle && <p className="mt-5 max-w-2xl text-lg text-bone">{subtitle}</p>}
        </Reveal>
      </div>
    </section>
  );
}
