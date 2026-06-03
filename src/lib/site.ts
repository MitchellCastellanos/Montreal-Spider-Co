export const SITE = {
  name: "Montreal Spider Co.",
  shortName: "Montreal Spider Co.",
  url: "https://montrealspiderco.ca",
  email: "hello@montrealspiderco.ca",
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
