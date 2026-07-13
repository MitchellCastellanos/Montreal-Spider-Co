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

/** Interpolate {token} placeholders from data (falls back to the sample value, then ""). */
function fill(text: string, data: Record<string, string>, sample: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => data[key] ?? sample[key] ?? "");
}

type SimpleTemplateSpec = {
  id: string;
  label: string;
  description: string;
  sample: Record<string, string>;
  /** Subject line with {token} placeholders. `fr` falls back to `en`. */
  subject: { en: string; fr?: string };
  /** Paragraphs with {token} placeholders. HTML allowed. `fr` falls back to `en`. */
  paragraphs: { en: string[]; fr?: string[] };
  /** Optional CTA button; href comes from the data key given in `hrefKey`. */
  cta?: { en: string; fr?: string; hrefKey: string };
};

/**
 * Compact factory for the operational template catalog (fulfillment, partner ops,
 * settlements, internal alerts). Keeps each template declarative so the catalog
 * stays readable as it grows.
 */
function simpleTemplate(spec: SimpleTemplateSpec): EmailTemplate {
  return {
    id: spec.id,
    label: spec.label,
    description: spec.description,
    sample: spec.sample,
    render(locale, data) {
      const isFr = locale === "fr";
      const subject = fill(isFr ? spec.subject.fr ?? spec.subject.en : spec.subject.en, data, spec.sample);
      const paragraphs = (isFr ? spec.paragraphs.fr ?? spec.paragraphs.en : spec.paragraphs.en).map((t) =>
        fill(t, data, spec.sample),
      );
      let bodyHtml = paragraphs.map(p).join("");
      if (spec.cta) {
        const href = get(data, spec.cta.hrefKey, spec.sample[spec.cta.hrefKey] ?? SITE.url);
        bodyHtml += button(fill(isFr ? spec.cta.fr ?? spec.cta.en : spec.cta.en, data, spec.sample), href);
      }
      bodyHtml += p(isFr ? `— L'équipe ${SITE.name}` : `— The ${SITE.name} team`);
      const textLines = paragraphs.map((t) => t.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, ""));
      if (spec.cta) {
        textLines.push(get(data, spec.cta.hrefKey, spec.sample[spec.cta.hrefKey] ?? SITE.url));
      }
      textLines.push(`— ${SITE.name}`);
      return {
        subject,
        html: layout({ locale, preview: subject, bodyHtml }),
        text: textLines.join("\n\n"),
      };
    },
  };
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
  {
    id: "distributor-sale-alert",
    label: "Distributor stock sold (staff)",
    description:
      "Internal alert when a web order uses stock at an authorized distributor — call them to mark the spider sold.",
    sample: {
      orderNumber: "MSC-1042",
      customerName: "Alex",
      customerEmail: "alex@example.com",
      customerPhone: "514-555-0100",
      total: "$129.00 CAD",
      itemLines:
        "• Mexican Red Knee (2 3/8″, unsexed) @ Reptile Concept — $129.00 · 514-555-9999\nCALL Reptile Concept to mark this spider sold.",
    },
    render(_locale, data) {
      const orderNumber = get(data, "orderNumber", "MSC-0000");
      const customerName = get(data, "customerName", "Customer");
      const customerEmail = get(data, "customerEmail", "");
      const customerPhone = get(data, "customerPhone", "");
      const total = get(data, "total", "$0.00 CAD");
      const itemLines = get(data, "itemLines", "").replace(/\n/g, "<br />");
      const subject = `📞 Distributor stock sold — ${orderNumber}`;
      const body =
        `${p(`A web order just sold stock held at a distributor. <strong>Call them now</strong> so they mark the spider sold.`)}` +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;border:1px solid #e7ddc6;border-radius:12px;">
          <tr><td style="padding:14px 18px;border-bottom:1px solid #efe7d4;"><strong>Order:</strong> ${orderNumber}</td></tr>
          <tr><td style="padding:14px 18px;border-bottom:1px solid #efe7d4;"><strong>Customer:</strong> ${customerName}${customerPhone ? `<br />${customerPhone}` : ""}${customerEmail ? `<br />${customerEmail}` : ""}</td></tr>
          <tr><td style="padding:14px 18px;border-bottom:1px solid #efe7d4;"><strong>Stripe total:</strong> ${total}</td></tr>
          <tr><td style="padding:14px 18px;"><strong>At distributor:</strong><br />${itemLines}</td></tr>
        </table>` +
        `${p("Payment is in your <a href=\"https://dashboard.stripe.com/balance\">Stripe balance</a>. Finance also shows this sale under Admin → Finance.")}` +
        `${p("— Montreal Spider Co. (automated)")}`;
      const html = layout({ locale: "en", preview: subject, bodyHtml: body });
      const text = `Distributor stock sold — ${orderNumber}\n\nCustomer: ${customerName}\n${customerPhone}\n${customerEmail}\nTotal: ${total}\n\n${get(data, "itemLines", "")}\n\nPayment: Stripe dashboard → Balance\n\n— Montreal Spider Co.`;
      return { subject, html, text };
    },
  },

  // -------------------------------------------------------------------------
  // Customer fulfillment lifecycle
  // -------------------------------------------------------------------------
  simpleTemplate({
    id: "preparing-specimen",
    label: "Preparing your specimen",
    description: "Sent when MSC starts preparing a paid order for pickup/meetup.",
    sample: { name: "Alex", orderNumber: "MSC-1042" },
    subject: {
      en: "We're preparing your spiders — {orderNumber}",
      fr: "Nous préparons vos mygales — {orderNumber}",
    },
    paragraphs: {
      en: [
        "Hi {name},",
        "Your order <strong>{orderNumber}</strong> is now being prepared. Each spider gets a final health check, a fresh enclosure and travel-safe packing.",
        "We'll email you the moment it's ready to collect.",
      ],
      fr: [
        "Bonjour {name},",
        "Votre commande <strong>{orderNumber}</strong> est en préparation. Chaque mygale reçoit un dernier contrôle de santé, un contenant propre et un emballage sécuritaire.",
        "Nous vous écrirons dès qu'elle sera prête à récupérer.",
      ],
    },
  }),
  simpleTemplate({
    id: "pickup-reminder",
    label: "Pickup reminder",
    description: "Reminder that an order is waiting to be collected.",
    sample: { name: "Alex", orderNumber: "MSC-1042", pickupName: "Plateau pickup point", collectBy: "July 18" },
    subject: {
      en: "Reminder — your order {orderNumber} is waiting",
      fr: "Rappel — votre commande {orderNumber} vous attend",
    },
    paragraphs: {
      en: [
        "Hi {name},",
        "A friendly reminder that your order <strong>{orderNumber}</strong> is ready at <strong>{pickupName}</strong>.",
        "Please collect it by <strong>{collectBy}</strong> so your spider spends as little time as possible in transit housing.",
      ],
      fr: [
        "Bonjour {name},",
        "Petit rappel : votre commande <strong>{orderNumber}</strong> est prête chez <strong>{pickupName}</strong>.",
        "Merci de la récupérer avant le <strong>{collectBy}</strong> pour que votre mygale passe le moins de temps possible en contenant de transport.",
      ],
    },
  }),
  simpleTemplate({
    id: "final-pickup-reminder",
    label: "Final pickup reminder",
    description: "Last reminder before the no-show deadline.",
    sample: { name: "Alex", orderNumber: "MSC-1042", pickupName: "Plateau pickup point", collectBy: "July 18" },
    subject: {
      en: "Final reminder — order {orderNumber} must be collected by {collectBy}",
      fr: "Dernier rappel — commande {orderNumber} à récupérer avant le {collectBy}",
    },
    paragraphs: {
      en: [
        "Hi {name},",
        "This is the final reminder for order <strong>{orderNumber}</strong>, ready at <strong>{pickupName}</strong>.",
        "If it isn't collected by <strong>{collectBy}</strong>, the order will be cancelled and refunded per our pickup policy.",
        "Need more time or a different arrangement? Just reply to this email — we're flexible when we hear from you.",
      ],
      fr: [
        "Bonjour {name},",
        "Ceci est le dernier rappel pour la commande <strong>{orderNumber}</strong>, prête chez <strong>{pickupName}</strong>.",
        "Si elle n'est pas récupérée avant le <strong>{collectBy}</strong>, la commande sera annulée et remboursée selon notre politique de cueillette.",
        "Besoin de plus de temps ou d'un autre arrangement ? Répondez simplement à ce courriel.",
      ],
    },
  }),
  simpleTemplate({
    id: "no-show-warning",
    label: "No-show warning",
    description: "Sent when the pickup window has expired, before cancellation.",
    sample: { name: "Alex", orderNumber: "MSC-1042", graceHours: "24" },
    subject: {
      en: "Your pickup window for {orderNumber} has expired",
      fr: "Le délai de cueillette pour {orderNumber} est expiré",
    },
    paragraphs: {
      en: [
        "Hi {name},",
        "The pickup window for order <strong>{orderNumber}</strong> has passed and the order is flagged as uncollected.",
        "If we don't hear from you within <strong>{graceHours} hours</strong>, the order will be cancelled and refunded (a no-show fee may apply).",
        "Reply to this email if you still want your spider — we'd love to complete the adoption.",
      ],
      fr: [
        "Bonjour {name},",
        "Le délai de cueillette de la commande <strong>{orderNumber}</strong> est dépassé et la commande est marquée comme non réclamée.",
        "Sans nouvelles de votre part d'ici <strong>{graceHours} heures</strong>, la commande sera annulée et remboursée (des frais de non-présentation peuvent s'appliquer).",
        "Répondez à ce courriel si vous voulez toujours votre mygale — nous serons ravis de finaliser l'adoption.",
      ],
    },
  }),
  simpleTemplate({
    id: "order-cancelled",
    label: "Order cancelled",
    description: "Confirms an order was cancelled (no-show or manual).",
    sample: { name: "Alex", orderNumber: "MSC-1042", reason: "the pickup window expired" },
    subject: {
      en: "Order {orderNumber} has been cancelled",
      fr: "Commande {orderNumber} annulée",
    },
    paragraphs: {
      en: [
        "Hi {name},",
        "Your order <strong>{orderNumber}</strong> has been cancelled because {reason}.",
        "If a refund applies, you'll receive a separate confirmation once it's processed.",
        "The spiders return to our care and to the website — you're always welcome back.",
      ],
      fr: [
        "Bonjour {name},",
        "Votre commande <strong>{orderNumber}</strong> a été annulée : {reason}.",
        "Si un remboursement s'applique, vous recevrez une confirmation distincte lorsqu'il sera traité.",
        "Les mygales retournent à nos soins et sur le site — vous êtes toujours le bienvenu.",
      ],
    },
  }),
  simpleTemplate({
    id: "refund-issued",
    label: "Refund issued",
    description: "Confirms a Stripe refund was issued to the customer.",
    sample: { name: "Alex", orderNumber: "MSC-1042", amount: "$129.00 CAD" },
    subject: {
      en: "Refund issued for order {orderNumber}",
      fr: "Remboursement émis pour la commande {orderNumber}",
    },
    paragraphs: {
      en: [
        "Hi {name},",
        "We've issued a refund of <strong>{amount}</strong> for order <strong>{orderNumber}</strong>.",
        "Depending on your bank, it can take 5–10 business days to appear on your statement.",
      ],
      fr: [
        "Bonjour {name},",
        "Nous avons émis un remboursement de <strong>{amount}</strong> pour la commande <strong>{orderNumber}</strong>.",
        "Selon votre banque, il peut s'écouler de 5 à 10 jours ouvrables avant qu'il apparaisse sur votre relevé.",
      ],
    },
  }),
  simpleTemplate({
    id: "pickup-completed",
    label: "Pickup completed",
    description: "Sent after the customer collects their spider — includes care resources.",
    sample: { name: "Alex", orderNumber: "MSC-1042", careUrl: `${SITE.url}/care` },
    subject: {
      en: "Welcome home, little one — {orderNumber} complete",
      fr: "Bienvenue à la maison — {orderNumber} complétée",
    },
    paragraphs: {
      en: [
        "Hi {name},",
        "Order <strong>{orderNumber}</strong> is complete — your spider is officially home. 🕷️",
        "Give it a quiet 48 hours to settle in before offering food. Our care guides cover everything from humidity to first molts.",
      ],
      fr: [
        "Bonjour {name},",
        "La commande <strong>{orderNumber}</strong> est complétée — votre mygale est officiellement chez vous. 🕷️",
        "Laissez-lui 48 heures de calme avant d'offrir de la nourriture. Nos guides couvrent tout, de l'humidité aux premières mues.",
      ],
    },
    cta: { en: "Read the care guides", fr: "Voir les guides de soins", hrefKey: "careUrl" },
  }),

  // -------------------------------------------------------------------------
  // Partner operations (partners interact via email + simple links — no dashboards)
  // -------------------------------------------------------------------------
  simpleTemplate({
    id: "partner-pickup-reservation",
    label: "Partner — pickup reservation received",
    description: "Tells a partner that a web order reserved specimens held at their store.",
    sample: {
      partnerName: "Reptile Concept",
      orderNumber: "MSC-1042",
      itemLines: "Grammostola pulchra (2 3/8″, unsexed)",
    },
    subject: { en: "Reservation — please hold inventory for order {orderNumber}" },
    paragraphs: {
      en: [
        "Hi {partnerName},",
        "A Montreal Spider Co. web order just reserved the following specimen(s) currently at your store:",
        "<strong>{itemLines}</strong>",
        "Please set them aside — they are no longer for walk-in sale. We'll follow up with pickup details for order <strong>{orderNumber}</strong>.",
      ],
    },
  }),
  simpleTemplate({
    id: "partner-customer-arriving",
    label: "Partner — customer arriving for pickup",
    description: "Tells the partner an order is ready and who will collect it, with a one-tap confirmation link.",
    sample: {
      partnerName: "Reptile Concept",
      orderNumber: "MSC-1042",
      customerName: "Alex",
      itemLines: "Grammostola pulchra (2 3/8″, unsexed)",
      confirmUrl: `${SITE.url}/en/p/pickup/sample-token`,
    },
    subject: { en: "Pickup — {customerName} is collecting order {orderNumber}" },
    paragraphs: {
      en: [
        "Hi {partnerName},",
        "<strong>{customerName}</strong> will collect order <strong>{orderNumber}</strong>:",
        "<strong>{itemLines}</strong>",
        "When you hand it over, tap the button below (or scan the specimen's QR) to confirm delivery — this settles the inventory automatically.",
      ],
    },
    cta: { en: "Confirm handover", hrefKey: "confirmUrl" },
  }),
  simpleTemplate({
    id: "partner-specimen-sold",
    label: "Partner — walk-in sale registered",
    description: "Confirms a walk-in sale registered by QR at the partner store.",
    sample: {
      partnerName: "Reptile Concept",
      itemLine: "Grammostola pulchra (2 3/8″, unsexed)",
      salePrice: "$140.00 CAD",
      settlementPrice: "$95.00 CAD",
    },
    subject: { en: "Sale registered — {itemLine}" },
    paragraphs: {
      en: [
        "Hi {partnerName},",
        "The walk-in sale of <strong>{itemLine}</strong> was registered successfully.",
        "Sale price: <strong>{salePrice}</strong> · Owed to MSC: <strong>{settlementPrice}</strong>.",
        "This entry was added to your settlement ledger and will appear on your next monthly statement.",
      ],
    },
  }),
  simpleTemplate({
    id: "partner-no-show-summary",
    label: "Partner — no-show summary",
    description: "Tells the partner a reserved order was never collected and what happens next.",
    sample: { partnerName: "Reptile Concept", orderNumber: "MSC-1042", itemLines: "Grammostola pulchra (2 3/8″)" },
    subject: { en: "No-show — order {orderNumber} was not collected" },
    paragraphs: {
      en: [
        "Hi {partnerName},",
        "Order <strong>{orderNumber}</strong> was not collected within the pickup window. The reservation on the following specimen(s) is lifted:",
        "<strong>{itemLines}</strong>",
        "Our team will contact you shortly about whether the inventory stays with you, returns to our warehouse, or transfers elsewhere. Nothing to do on your side for now.",
      ],
    },
  }),
  simpleTemplate({
    id: "partner-restock-proposal",
    label: "Partner — restock recommendation",
    description: "Proposes replacement inventory to a partner; nothing ships until they confirm.",
    sample: {
      partnerName: "Reptile Concept",
      itemLines: "2× Grammostola pulchra (2″) · 1× Caribena versicolor (1.5″)",
      reason: "Your display sold through faster than expected",
      preferredDate: "July 22",
      confirmUrl: `${SITE.url}/en/p/restock/sample-token`,
    },
    subject: { en: "Restock proposal for your MSC display" },
    paragraphs: {
      en: [
        "Hi {partnerName},",
        "{reason} — we'd like to send you the following specimens:",
        "<strong>{itemLines}</strong>",
        "Suggested delivery date: <strong>{preferredDate}</strong>.",
        "Nothing ships until you confirm. Review and approve (or decline) with one tap below.",
      ],
    },
    cta: { en: "Review the proposal", hrefKey: "confirmUrl" },
  }),
  simpleTemplate({
    id: "partner-restock-approved",
    label: "Partner — restock approved",
    description: "Confirms a restock proposal was approved and is being scheduled.",
    sample: { partnerName: "Reptile Concept", itemLines: "2× Grammostola pulchra (2″)", preferredDate: "July 22" },
    subject: { en: "Restock confirmed — delivery around {preferredDate}" },
    paragraphs: {
      en: [
        "Hi {partnerName},",
        "Thanks for confirming! We'll deliver:",
        "<strong>{itemLines}</strong>",
        "Target date: <strong>{preferredDate}</strong>. You'll get a transfer notice when the specimens are on their way.",
      ],
    },
  }),
  simpleTemplate({
    id: "partner-transfer-notice",
    label: "Partner — inventory transfer notice",
    description: "Notifies a partner that specimens are in transit to (or from) their store.",
    sample: { partnerName: "Reptile Concept", direction: "to", itemLines: "2× Grammostola pulchra (2″)" },
    subject: { en: "Inventory transfer {direction} your store" },
    paragraphs: {
      en: [
        "Hi {partnerName},",
        "The following MSC inventory is being transferred {direction} your store:",
        "<strong>{itemLines}</strong>",
        "Remember: consignment inventory remains the property of Montreal Spider Co. until sold.",
      ],
    },
  }),
  simpleTemplate({
    id: "partner-inventory-delivered",
    label: "Partner — inventory delivered",
    description: "Confirms specimens arrived at the partner store and are live for sale.",
    sample: { partnerName: "Reptile Concept", itemLines: "2× Grammostola pulchra (2″)" },
    subject: { en: "Inventory delivered — your display is restocked" },
    paragraphs: {
      en: [
        "Hi {partnerName},",
        "The following specimens were delivered to your store and are now active in your display:",
        "<strong>{itemLines}</strong>",
        "Each enclosure carries a QR label — scan it to register a walk-in sale in seconds.",
      ],
    },
  }),
  simpleTemplate({
    id: "partner-audit-completed",
    label: "Partner — audit completed",
    description: "Summary sent to the partner after an MSC store audit visit.",
    sample: {
      partnerName: "Reptile Concept",
      auditDate: "July 12",
      foundCount: "7",
      missingCount: "1",
      notes: "All animals in great shape; one enclosure needs a substrate refresh.",
    },
    subject: { en: "Audit completed — your MSC display on {auditDate}" },
    paragraphs: {
      en: [
        "Hi {partnerName},",
        "We visited your store on <strong>{auditDate}</strong>. Summary: <strong>{foundCount}</strong> specimens verified, <strong>{missingCount}</strong> unaccounted for.",
        "{notes}",
        "If anything needs following up, our team will reach out separately.",
      ],
    },
  }),
  simpleTemplate({
    id: "partner-monthly-statement",
    label: "Partner — monthly settlement statement",
    description: "Monthly statement generated from the settlement ledger.",
    sample: {
      partnerName: "Reptile Concept",
      period: "June 2026",
      salesCount: "4",
      totalSales: "$540.00 CAD",
      totalOwed: "$360.00 CAD",
      totalMargin: "$180.00 CAD",
    },
    subject: { en: "Your MSC settlement statement — {period}" },
    paragraphs: {
      en: [
        "Hi {partnerName},",
        "Here's your settlement statement for <strong>{period}</strong>:",
        "Sales registered: <strong>{salesCount}</strong><br />Total sales: <strong>{totalSales}</strong><br />Amount owed to MSC: <strong>{totalOwed}</strong><br />Your margin: <strong>{totalMargin}</strong>",
        "Payment is due within 15 days. Reply to this email with any questions about individual entries.",
      ],
    },
  }),
  simpleTemplate({
    id: "partner-payment-received",
    label: "Partner — payment received",
    description: "Confirms a settlement payment was received from the partner.",
    sample: { partnerName: "Reptile Concept", period: "June 2026", amount: "$360.00 CAD" },
    subject: { en: "Payment received — {period} statement settled" },
    paragraphs: {
      en: [
        "Hi {partnerName},",
        "We received your payment of <strong>{amount}</strong> for the <strong>{period}</strong> statement. Your ledger is settled — thank you!",
      ],
    },
  }),
  simpleTemplate({
    id: "partner-invitation",
    label: "Partner — new partner invitation",
    description: "Invites a prospective store to host an MSC display (sales outreach).",
    sample: { contactName: "Marie", storeName: "Reptile Concept" },
    subject: { en: "Partner with Montreal Spider Co. — a living display for {storeName}" },
    paragraphs: {
      en: [
        "Hi {contactName},",
        `${SITE.name} places curated, fully-maintained tarantula displays in select Montréal shops. We handle the animals, husbandry visits, restocks and marketing — you earn a margin on every sale with zero inventory risk.`,
        "Interested? Reply to this email and we'll set up a quick visit.",
      ],
    },
  }),

  // -------------------------------------------------------------------------
  // Internal (MSC staff)
  // -------------------------------------------------------------------------
  simpleTemplate({
    id: "internal-new-order",
    label: "Internal — new paid order",
    description: "Staff alert for every new paid web order.",
    sample: {
      orderNumber: "MSC-1042",
      customerName: "Alex",
      total: "$129.00 CAD",
      method: "Pickup — Plateau pickup point",
      itemLines: "Grammostola pulchra (2 3/8″, unsexed)",
    },
    subject: { en: "🕷️ New order {orderNumber} — {total}" },
    paragraphs: {
      en: [
        "New paid order <strong>{orderNumber}</strong> from <strong>{customerName}</strong>.",
        "<strong>Items:</strong><br />{itemLines}",
        "<strong>Fulfillment:</strong> {method}<br /><strong>Total:</strong> {total}",
        "Specimens are allocated and hidden from the storefront. Start preparation from Admin → Operations.",
      ],
    },
  }),
  simpleTemplate({
    id: "internal-pickup-overdue",
    label: "Internal — pickup overdue",
    description: "Staff alert when an order passes its collect-by deadline.",
    sample: { orderNumber: "MSC-1042", customerName: "Alex", collectBy: "July 18", pickupName: "Plateau pickup point" },
    subject: { en: "⚠️ Pickup overdue — {orderNumber}" },
    paragraphs: {
      en: [
        "Order <strong>{orderNumber}</strong> ({customerName}) was not collected by <strong>{collectBy}</strong> at {pickupName}.",
        "The customer received a no-show warning. Process the no-show (refund + release) from Admin → Operations, or extend the window after contacting them.",
      ],
    },
  }),
  simpleTemplate({
    id: "internal-specimen-issue",
    label: "Internal — specimen issue reported",
    description: "Staff alert when an issue is reported from a specimen QR page.",
    sample: { specimenLabel: "Grammostola pulchra (2 3/8″)", locationName: "Reptile Concept", issue: "Enclosure cracked" },
    subject: { en: "🚨 Specimen issue — {specimenLabel} at {locationName}" },
    paragraphs: {
      en: [
        "An issue was reported for <strong>{specimenLabel}</strong> at <strong>{locationName}</strong>:",
        "<strong>{issue}</strong>",
        "A task was created in Admin → Operations.",
      ],
    },
  }),
  simpleTemplate({
    id: "internal-restock-awaiting",
    label: "Internal — restock awaiting confirmation",
    description: "Staff alert when a restock proposal is sent or a partner responds.",
    sample: { locationName: "Reptile Concept", status: "confirmed", itemLines: "2× Grammostola pulchra (2″)" },
    subject: { en: "Restock {status} — {locationName}" },
    paragraphs: {
      en: [
        "Restock proposal for <strong>{locationName}</strong> is now <strong>{status}</strong>.",
        "<strong>{itemLines}</strong>",
        "Manage it from Admin → Restock.",
      ],
    },
  }),
  simpleTemplate({
    id: "internal-refund-processed",
    label: "Internal — refund processed",
    description: "Staff record of an automatic or manual refund.",
    sample: { orderNumber: "MSC-1042", amount: "$129.00 CAD", reason: "no-show" },
    subject: { en: "Refund processed — {orderNumber} ({amount})" },
    paragraphs: {
      en: [
        "A refund of <strong>{amount}</strong> was processed for order <strong>{orderNumber}</strong>.",
        "Reason: {reason}.",
        "The specimens were released back to available and a disposition task was created if needed.",
      ],
    },
  }),
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
