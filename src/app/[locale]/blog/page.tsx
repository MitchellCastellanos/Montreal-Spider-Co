import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMeta } from "@/lib/pageMeta";
import { localeHref } from "@/lib/href";
import { BLOG_POSTS } from "@/lib/blog";
import { t } from "@/lib/types";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  return pageMeta(loc, "/blog", dict.blog.title, dict.blog.subtitle);
}

export default async function BlogIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);

  const posts = [...BLOG_POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  return (
    <>
      <PageHero kicker={dict.blog.kicker} title={dict.blog.title} subtitle={dict.blog.subtitle} />
      <section className="container-x py-16">
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={i * 0.07}>
              <Link href={localeHref(loc, `/blog/${post.slug}`)} className="card-glow group flex h-full flex-col rounded-2xl p-6">
                <span className="badge w-fit">{t(post.category, loc)}</span>
                <h2 className="mt-4 font-display text-xl font-semibold text-cream group-hover:text-gold-bright">{t(post.title, loc)}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-bone">{t(post.summary, loc)}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted">
                  <span>
                    {post.minRead} {dict.care.minRead}
                  </span>
                  <span className="font-semibold text-gold-bright">{dict.blog.readArticle} →</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
