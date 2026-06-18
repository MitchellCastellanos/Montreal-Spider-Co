// Production canonical URL. On Vercel, NEXT_PUBLIC_SITE_URL can override this so
// preview deployments generate correct canonical/OG/sitemap links.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://montrealspider.ca";

export const SITE = {
  name: "Montreal Spider Co.",
  shortName: "Montreal Spider Co.",
  url: SITE_URL,
  email: "hello@montrealspider.ca",
  city: "Montréal",
  region: "QC",
  country: "CA",
  established: 2026,
  currency: "CAD",
  locales: ["en", "fr"] as const,
  social: {
    instagram: "https://instagram.com/montrealspiderco",
    facebook: "https://facebook.com/montrealspiderco",
    tiktok: "https://tiktok.com/@montrealspiderco",
  },
  taxRate: 0.14975, // GST 5% + QST 9.975%
} as const;
