import { SITE } from "@/lib/site";

/**
 * Transactional email templates for Montreal Spider Co.
 *
 * This module is pure (no Resend / no "server-only") so the rendered output can
 * be reused by the real sending code in `@/lib/email` and the template metadata
 * can be surfaced to the admin panel. Templates keep evolving in code — the
 * admin "Templates" section only sends them as a test to a chosen address.
 */

export type EmailLocale = "en" | "fr";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type EmailTemplate = {
  id: string;
  /** Human label shown in the admin selector. */
  label: string;
  /** Short description of when this email is sent. */
  description: string;
  /** Placeholder values used when sending a test from the admin panel. */
  sample: Record<string, string>;
  render: (locale: EmailLocale, data: Record<string, string>) => RenderedEmail;
};

const brandGold = "#c9a24b";
const ink = "#14110d";
const cream = "#f4ecd8";

/** Shared branded HTML shell. Body is the inner content for the white card. */
function layout(opts: { locale: EmailLocale; preview: string; bodyHtml: string }): string {
  const year = new Date().getFullYear();
  const tagline = opts.locale === "fr" ? "Mygales élevées avec soin à Montréal" : "Tarantulas raised with care in Montréal";
  return `<!doctype html>
<html lang="${opts.locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${SITE.name}</title>
  </head>
  <body style="margin:0;padding:0;background:#0c0a07;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preview}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0a07;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7ddc6;">
            <tr>
              <td style="background:${ink};padding:24px 28px;text-align:center;">
                <div style="font-size:18px;font-weight:700;letter-spacing:0.5px;color:${cream};">${SITE.name}</div>
                <div style="margin-top:4px;font-size:12px;color:${brandGold};">${tagline}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;color:#33291a;font-size:15px;line-height:1.6;">
                ${opts.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background:#f7f1e3;padding:18px 28px;text-align:center;font-size:12px;color:#8a7b5c;">
                ${SITE.name} · ${SITE.city}, ${SITE.region}<br />
                <a href="${SITE.url}" style="color:#8a7b5c;">${SITE.url.replace(/^https?:\/\//, "")}</a> · ${SITE.email}<br />
                <span style="color:#b6a884;">© ${year} ${SITE.name}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:10px;background:${brandGold};">
    <a href="${href}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:${ink};text-decoration:none;border-radius:10px;">${label}</a>
  </td></tr></table>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;">${text}</p>`;
}

function get(data: Record<string, string>, key: string, fallback = ""): string {
  const v = data[key];
  return v == null || v === "" ? fallback : v;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "order-confirmation",
    label: "Order confirmation",
    description: "Sent right after a customer completes checkout.",
    sample: { name: "Alex", orderNumber: "MSC-1042", total: "$129.00 CAD" },
    render(locale, data) {
      const name = get(data, "name", "there");
      const orderNumber = get(data, "orderNumber", "MSC-0000");
      const total = get(data, "total", "$0.00 CAD");
      const isFr = locale === "fr";
      const subject = isFr ? `Commande confirmée — ${orderNumber}` : `Order confirmed — ${orderNumber}`;
      const detailLabel = isFr ? "Numéro de commande" : "Order number";
      const totalLabel = isFr ? "Total" : "Total";
      const body = isFr
        ? `${p(`Bonjour ${name},`)}${p(`Merci pour votre commande chez ${SITE.name}! Nous préparons vos mygales avec soin.`)}`
        : `${p(`Hi ${name},`)}${p(`Thank you for your order at ${SITE.name}! Your spiders are being prepared with care.`)}`;
      const card = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;border:1px solid #e7ddc6;border-radius:12px;">
        <tr><td style="padding:14px 18px;border-bottom:1px solid #efe7d4;"><strong>${detailLabel}:</strong> ${orderNumber}</td></tr>
        <tr><td style="padding:14px 18px;"><strong>${totalLabel}:</strong> ${total}</td></tr>
      </table>`;
      const closing = isFr ? `${p("— L'équipe " + SITE.name)}` : `${p("— The " + SITE.name + " team")}`;
      const html = layout({ locale, preview: subject, bodyHtml: body + card + closing });
      const text = isFr
        ? `Bonjour ${name},\n\nMerci pour votre commande chez ${SITE.name}!\n\n${detailLabel}: ${orderNumber}\n${totalLabel}: ${total}\n\nNous préparons vos mygales avec soin.\n\n— ${SITE.name}`
        : `Hi ${name},\n\nThank you for your order at ${SITE.name}!\n\n${detailLabel}: ${orderNumber}\n${totalLabel}: ${total}\n\nYour spiders are being prepared with care.\n\n— ${SITE.name}`;
      return { subject, html, text };
    },
  },
  {
    id: "pickup-ready",
    label: "Order ready for pickup",
    description: "Lets a customer know their order is ready to collect at a pickup point.",
    sample: {
      name: "Alex",
      orderNumber: "MSC-1042",
      pickupName: "Plateau pickup point",
      pickupAddress: "1234 Av. du Mont-Royal E, Montréal",
      pickupWindow: "2 days",
    },
    render(locale, data) {
      const name = get(data, "name", "there");
      const orderNumber = get(data, "orderNumber", "MSC-0000");
      const pickupName = get(data, "pickupName", "your pickup point");
      const pickupAddress = get(data, "pickupAddress", "");
      const pickupWindow = get(data, "pickupWindow", "2 days");
      const isFr = locale === "fr";
      const subject = isFr
        ? `Votre commande est prête — ${orderNumber}`
        : `Your order is ready for pickup — ${orderNumber}`;
      const body = isFr
        ? `${p(`Bonjour ${name},`)}${p(`Bonne nouvelle — votre commande <strong>${orderNumber}</strong> est prête à être récupérée.`)}${p(`<strong>Point de collecte :</strong> ${pickupName}${pickupAddress ? `<br />${pickupAddress}` : ""}`)}${p(`Veuillez la récupérer dans les <strong>${pickupWindow}</strong>. Apportez votre numéro de commande.`)}${p("— L'équipe " + SITE.name)}`
        : `${p(`Hi ${name},`)}${p(`Good news — your order <strong>${orderNumber}</strong> is ready for pickup.`)}${p(`<strong>Pickup point:</strong> ${pickupName}${pickupAddress ? `<br />${pickupAddress}` : ""}`)}${p(`Please collect it within <strong>${pickupWindow}</strong>. Bring your order number with you.`)}${p("— The " + SITE.name + " team")}`;
      const html = layout({ locale, preview: subject, bodyHtml: body });
      const text = isFr
        ? `Bonjour ${name},\n\nVotre commande ${orderNumber} est prête à être récupérée.\n\nPoint de collecte: ${pickupName}\n${pickupAddress}\n\nVeuillez la récupérer dans les ${pickupWindow}.\n\n— ${SITE.name}`
        : `Hi ${name},\n\nYour order ${orderNumber} is ready for pickup.\n\nPickup point: ${pickupName}\n${pickupAddress}\n\nPlease collect it within ${pickupWindow}.\n\n— ${SITE.name}`;
      return { subject, html, text };
    },
  },
  {
    id: "password-reset",
    label: "Password reset",
    description: "Sent when a customer requests a password reset link.",
    sample: { name: "Alex", resetUrl: `${SITE.url}/account/reset?token=sample-token`, expiresIn: "1 hour" },
    render(locale, data) {
      const name = get(data, "name", "there");
      const resetUrl = get(data, "resetUrl", `${SITE.url}/account/reset`);
      const expiresIn = get(data, "expiresIn", "1 hour");
      const isFr = locale === "fr";
      const subject = isFr ? "Réinitialisez votre mot de passe" : "Reset your password";
      const btn = button(isFr ? "Réinitialiser le mot de passe" : "Reset password", resetUrl);
      const body = isFr
        ? `${p(`Bonjour ${name},`)}${p("Nous avons reçu une demande de réinitialisation du mot de passe de votre compte.")}${btn}${p(`Ce lien expire dans <strong>${expiresIn}</strong>. Si vous n'avez pas fait cette demande, ignorez ce courriel — votre mot de passe restera inchangé.`)}${p("— L'équipe " + SITE.name)}`
        : `${p(`Hi ${name},`)}${p("We received a request to reset the password for your account.")}${btn}${p(`This link expires in <strong>${expiresIn}</strong>. If you didn't request this, ignore this email — your password won't change.`)}${p("— The " + SITE.name + " team")}`;
      const html = layout({ locale, preview: subject, bodyHtml: body });
      const text = isFr
        ? `Bonjour ${name},\n\nNous avons reçu une demande de réinitialisation de mot de passe.\n\nRéinitialisez-le ici: ${resetUrl}\n\nCe lien expire dans ${expiresIn}. Si vous n'avez pas fait cette demande, ignorez ce courriel.\n\n— ${SITE.name}`
        : `Hi ${name},\n\nWe received a request to reset your password.\n\nReset it here: ${resetUrl}\n\nThis link expires in ${expiresIn}. If you didn't request this, ignore this email.\n\n— ${SITE.name}`;
      return { subject, html, text };
    },
  },
  {
    id: "welcome",
    label: "Welcome / account created",
    description: "Sent after a customer creates an account.",
    sample: { name: "Alex" },
    render(locale, data) {
      const name = get(data, "name", "there");
      const isFr = locale === "fr";
      const subject = isFr ? `Bienvenue chez ${SITE.name}` : `Welcome to ${SITE.name}`;
      const btn = button(isFr ? "Explorer les mygales" : "Browse the spiders", `${SITE.url}/shop`);
      const body = isFr
        ? `${p(`Bonjour ${name},`)}${p(`Bienvenue chez ${SITE.name}! Votre compte est prêt. Vous pouvez maintenant suivre vos commandes et accélérer votre prochain passage en caisse.`)}${btn}${p("Une question sur les soins ? Répondez simplement à ce courriel — nous sommes des passionnés et heureux d'aider.")}${p("— L'équipe " + SITE.name)}`
        : `${p(`Hi ${name},`)}${p(`Welcome to ${SITE.name}! Your account is ready. You can now track your orders and check out faster next time.`)}${btn}${p("Questions about husbandry? Just reply to this email — we're keepers ourselves and happy to help.")}${p("— The " + SITE.name + " team")}`;
      const html = layout({ locale, preview: subject, bodyHtml: body });
      const text = isFr
        ? `Bonjour ${name},\n\nBienvenue chez ${SITE.name}! Votre compte est prêt.\n\nExplorez les mygales: ${SITE.url}/shop\n\n— ${SITE.name}`
        : `Hi ${name},\n\nWelcome to ${SITE.name}! Your account is ready.\n\nBrowse the spiders: ${SITE.url}/shop\n\n— ${SITE.name}`;
      return { subject, html, text };
    },
  },
  {
    id: "contact-received",
    label: "Contact form auto-reply",
    description: "Auto-reply confirming a contact / care question was received.",
    sample: { name: "Alex" },
    render(locale, data) {
      const name = get(data, "name", "there");
      const isFr = locale === "fr";
      const subject = isFr ? "Nous avons bien reçu votre message" : "We received your message";
      const body = isFr
        ? `${p(`Bonjour ${name},`)}${p("Merci de nous avoir écrit — votre message est bien arrivé. Nous répondons généralement sous 1 à 2 jours ouvrables.")}${p("En attendant, vous trouverez peut-être votre réponse dans nos guides de soins.")}${button("Voir les guides de soins", `${SITE.url}/care`)}${p("— L'équipe " + SITE.name)}`
        : `${p(`Hi ${name},`)}${p("Thanks for reaching out — your message landed safely. We usually reply within 1–2 business days.")}${p("In the meantime, you might find your answer in our care guides.")}${button("Read the care guides", `${SITE.url}/care`)}${p("— The " + SITE.name + " team")}`;
      const html = layout({ locale, preview: subject, bodyHtml: body });
      const text = isFr
        ? `Bonjour ${name},\n\nMerci de nous avoir écrit — votre message est bien arrivé. Nous répondons sous 1 à 2 jours ouvrables.\n\nGuides de soins: ${SITE.url}/care\n\n— ${SITE.name}`
        : `Hi ${name},\n\nThanks for reaching out — your message landed safely. We usually reply within 1–2 business days.\n\nCare guides: ${SITE.url}/care\n\n— ${SITE.name}`;
      return { subject, html, text };
    },
  },
];

export type EmailTemplateMeta = {
  id: string;
  label: string;
  description: string;
  fields: string[];
};

/** Lightweight metadata safe to pass to client components. */
export const EMAIL_TEMPLATE_META: EmailTemplateMeta[] = EMAIL_TEMPLATES.map((tpl) => ({
  id: tpl.id,
  label: tpl.label,
  description: tpl.description,
  fields: Object.keys(tpl.sample),
}));

export function getEmailTemplate(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((tpl) => tpl.id === id);
}
