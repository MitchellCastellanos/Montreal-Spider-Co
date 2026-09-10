import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog";
import { t } from "@/lib/types";
import { localeHref } from "@/lib/href";
import { breadcrumbSchema, blogPostingSchema } from "@/lib/seo";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import JsonLd from "@/components/JsonLd";

export function generateStaticParams() {
  return locales.flatMap((locale) => BLOG_POSTS.map((p) => ({ locale, slug: p.slug })));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: t(post.title, loc),
    description: t(post.summary, loc),
    alternates: {
      canonical: localeHref(loc, `/blog/${slug}`),
      languages: { en: `/en/blog/${slug}`, fr: `/fr/blog/${slug}`, "x-default": `/en/blog/${slug}` },
    },
    openGraph: {
      type: "article",
      title: t(post.title, loc),
      description: t(post.summary, loc),
      url: localeHref(loc, `/blog/${slug}`),
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const loc: Locale = locale;
  const post = getBlogPost(slug);
  if (!post) notFound();
  const dict = await getDictionary(loc);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: dict.meta.siteName, url: `/${loc}` },
          { name: dict.blog.title, url: `/${loc}/blog` },
          { name: t(post.title, loc), url: `/${loc}/blog/${slug}` },
        ])}
      />
      <JsonLd data={blogPostingSchema(post, loc, dict)} />
      <PageHero
        kicker={`${t(post.category, loc)} · ${post.minRead} ${dict.care.minRead}`}
        title={t(post.title, loc)}
        subtitle={t(post.summary, loc)}
      />

      <article className="container-x py-16">
        <Link href={localeHref(loc, "/blog")} className="mb-8 inline-block text-sm text-gold-deep hover:text-gold-bright">
          ← {dict.blog.backToBlog}
        </Link>
        <Reveal className="mx-auto mb-12 max-w-4xl">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-line">
            <Image
              src={`/images/blog/${post.slug}.png`}
              alt={t(post.title, loc)}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
              className="object-cover"
            />
          </div>
        </Reveal>
        <div className="mx-auto max-w-2xl space-y-10">
          {post.sections.map((section, i) => (
            <Reveal key={i} as="section">
              <h2 className="mb-3 font-display text-2xl font-bold text-cream">{t(section.heading, loc)}</h2>
              <div className="space-y-4">
                {section.body.map((para, j) => (
                  <p key={j} className="leading-relaxed text-bone">
                    {t(para, loc)}
                  </p>
                ))}
              </div>
            </Reveal>
          ))}
        </div>

        {post.relatedLinks.length > 0 && (
          <Reveal className="mx-auto mt-14 max-w-2xl border-t border-line pt-10">
            <h2 className="mb-4 font-display text-lg font-semibold text-cream">{dict.blog.relatedLinks}</h2>
            <div className="flex flex-wrap gap-3">
              {post.relatedLinks.map((link) => (
                <Link key={link.href} href={localeHref(loc, link.href)} className="badge hover:text-gold-bright">
                  {t(link.label, loc)} →
                </Link>
              ))}
            </div>
          </Reveal>
        )}
      </article>
    </>
  );
}
