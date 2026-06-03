import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { SITE } from "@/lib/site";
import PageHero from "@/components/PageHero";
import ContactForm from "@/components/ContactForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return pageMeta(loc, "/contact", dict.contact.title, dict.contact.subtitle);
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  const c = dict.contact;

  const info = [
    { label: c.emailLabel, value: SITE.email, href: `mailto:${SITE.email}` },
    { label: c.hoursLabel, value: c.hoursValue },
    { label: c.areaLabel, value: c.areaValue },
  ];

  return (
    <>
      <PageHero kicker={c.kicker} title={c.title} subtitle={c.subtitle} />
      <section className="container-x py-16">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ContactForm />
          </div>
          <aside className="lg:col-span-2">
            <div className="card-glow h-full rounded-2xl p-6 sm:p-8">
              <h2 className="font-display text-xl font-bold text-cream">{c.infoTitle}</h2>
              <dl className="mt-5 space-y-5">
                {info.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs uppercase tracking-wide text-muted">{item.label}</dt>
                    <dd className="mt-1 text-bone">
                      {item.href ? (
                        <a href={item.href} className="text-gold-bright hover:underline">{item.value}</a>
                      ) : (
                        item.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 border-t border-line pt-6">
                <p className="text-xs uppercase tracking-wide text-muted">{dict.footer.social}</p>
                <div className="mt-2 flex gap-4 text-sm">
                  <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" className="text-gold-bright hover:underline">Instagram</a>
                  <a href={SITE.social.facebook} target="_blank" rel="noopener noreferrer" className="text-gold-bright hover:underline">Facebook</a>
                  <a href={SITE.social.tiktok} target="_blank" rel="noopener noreferrer" className="text-gold-bright hover:underline">TikTok</a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
