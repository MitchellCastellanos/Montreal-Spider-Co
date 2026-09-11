const STYLE_EXAMPLE = `Example tone (do NOT copy this content — match the voice only):
Thanks for your patience while we sourced this one — it just cleared its final health check and is ready to go. This species is a great pick for a first arboreal: quick to settle, rarely defensive, and stunning once it colours up. We can have it packed and ready for pickup whenever suits you.`;

/** Mirrors the species-catalog ChatGPT helper: one copyable prompt, tuned for the shop's voice. */
export function buildEmailChatGptPrompt(topic: string, recipientName: string): string {
  const who = recipientName.trim() ? recipientName.trim() : "a customer";

  return `You are writing a customer email for Montreal Spider Co., a bilingual (English + French) captive-bred tarantula shop in Montreal, Canada.

Write the BODY of an email to ${who} about: "${topic.trim() || "(enter a topic above, then copy this prompt again)"}"

Match the tone we use across the site and our species care guides: warm, knowledgeable, precise — never salesy, never over-the-top. Write like a small, passionate, professional shop, not a corporation.

Rules:
- 2–5 short paragraphs, plain text, no markdown.
- Do NOT include a greeting ("Hi ___,") or a sign-off ("Sincerely, ...") — those are added separately.
- Do not invent order numbers, prices, or stock facts — leave a bracketed placeholder like [price] if a specific detail is needed.
- Return ONLY the email body paragraphs — no intro, no commentary, no quotation marks around it.

${STYLE_EXAMPLE}`;
}
