import type { L } from "../types";

export interface StoreSettings {
  /**
   * Business days a customer has to collect an order once it is ready. Counted on the days
   * the pickup location (distributor / pickup point) is open, until its closing time on the last day.
   */
  pickupBusinessDays: number;
  /** Pickup policy text. May contain the {days} token, replaced at render time. */
  pickupTerms: L;
  /** General terms & conditions (shown on /terms). */
  terms: L;
  /** Google Business Profile review link ("Write a review" short URL). Empty until the profile exists — the post-pickup review request email is skipped until this is set. */
  googleReviewUrl: string;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  pickupBusinessDays: 5,
  googleReviewUrl: "",
  pickupTerms: {
    en: "Once your order is ready for pickup or meetup, you have {days} business days to collect it — counted on the days your pickup point is open, up to its closing time on the last day. We'll message you as soon as it's ready, with your exact deadline. Orders left unclaimed after that window may be returned to our care, and a re-delivery or restocking fee may apply.",
    fr: "Une fois votre commande prête pour la cueillette ou la rencontre, vous avez {days} jours ouvrables pour la récupérer — comptés selon les jours d'ouverture de votre point de cueillette, jusqu'à sa fermeture le dernier jour. Nous vous écrirons dès qu'elle sera prête, avec votre date limite exacte. Les commandes non réclamées après ce délai peuvent retourner à nos soins, et des frais de nouvelle livraison ou de réapprovisionnement peuvent s'appliquer.",
  },
  terms: {
    en: "All animals sold by Montreal Spider Co. are captive-bred and TarantulApp Verified Origin. By placing an order you confirm you are of legal age and that keeping the species you purchase is permitted in your area.\n\nLive arrival is guaranteed on all pickup and meetup orders. Orders must be collected within the pickup window (business days of the pickup point). Prices are in CAD and include applicable taxes at checkout.\n\nContact us anytime with questions about your order or our care standards.",
    fr: "Tous les animaux vendus par Montreal Spider Co. sont nés en captivité et certifiés Origine Vérifiée TarantulApp. En passant une commande, vous confirmez être majeur et que la garde de l'espèce achetée est permise dans votre région.\n\nL'arrivée vivante est garantie sur toutes les commandes en cueillette et rencontre. Les commandes doivent être récupérées dans le délai de cueillette (jours ouvrables du point de cueillette). Les prix sont en CAD et incluent les taxes applicables à la caisse.\n\nÉcrivez-nous à tout moment pour toute question sur votre commande ou nos standards de soins.",
  },
};

/** Replace the {days} token in the pickup policy for display. */
export function resolvePickupTerms(s: StoreSettings, locale: "en" | "fr"): string {
  const text = locale === "fr" ? s.pickupTerms.fr : s.pickupTerms.en;
  return text.replace(/\{days\}/g, String(s.pickupBusinessDays));
}
