import type { L } from "../types";

export interface StoreSettings {
  /** Days a customer has to collect an order once it arrives at a pickup point. */
  pickupWindowDays: number;
  /** Pickup policy text. May contain the {days} token, replaced at render time. */
  pickupTerms: L;
  /** General terms & conditions (shown on /terms). */
  terms: L;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  pickupWindowDays: 2,
  pickupTerms: {
    en: "Once your order is ready for pickup or meetup, you have {days} days to collect it. We'll message you as soon as it's ready. Orders left unclaimed after the {days}-day window may be returned to our care, and a re-delivery or restocking fee may apply.",
    fr: "Une fois votre commande prête pour la cueillette ou la rencontre, vous avez {days} jours pour la récupérer. Nous vous écrirons dès qu'elle sera prête. Les commandes non réclamées après le délai de {days} jours peuvent retourner à nos soins, et des frais de nouvelle livraison ou de réapprovisionnement peuvent s'appliquer.",
  },
  terms: {
    en: "All animals sold by Montreal Spider Co. are captive-bred and TarantulApp Verified Origin. By placing an order you confirm you are of legal age and that keeping the species you purchase is permitted in your area.\n\nLive arrival is guaranteed on all local Montreal deliveries and pickup / meetup orders. Pickup and meetup orders must be collected within the window shown at checkout. Prices are in CAD and include applicable taxes at checkout.\n\nContact us anytime with questions about your order or our care standards.",
    fr: "Tous les animaux vendus par Montreal Spider Co. sont nés en captivité et certifiés Origine Vérifiée TarantulApp. En passant une commande, vous confirmez être majeur et que la garde de l'espèce achetée est permise dans votre région.\n\nL'arrivée vivante est garantie sur toutes les livraisons locales à Montréal et les commandes en cueillette / rencontre. Les commandes en cueillette ou rencontre doivent être récupérées dans le délai indiqué à la caisse. Les prix sont en CAD et incluent les taxes applicables à la caisse.\n\nÉcrivez-nous à tout moment pour toute question sur votre commande ou nos standards de soins.",
  },
};

/** Replace the {days} token in the pickup policy for display. */
export function resolvePickupTerms(s: StoreSettings, locale: "en" | "fr"): string {
  const text = locale === "fr" ? s.pickupTerms.fr : s.pickupTerms.en;
  return text.replace(/\{days\}/g, String(s.pickupWindowDays));
}
