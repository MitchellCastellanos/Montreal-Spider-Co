const STYLE_EXAMPLE = `Example (do NOT copy this content — match the structure and voice only):
Hi Alex,

Thank you for reaching out — thanks for your patience while we sourced this one. It just cleared its final health check and is ready to go. This species is a great pick for a first arboreal: quick to settle, rarely defensive, and stunning once it colours up. We can have it packed and ready for pickup whenever suits you.

If you have any other questions, we're here to help.

The Montreal Spider Co. team.`;

/** Mirrors the species-catalog ChatGPT helper: one copyable prompt, tuned for the shop's voice. */
export function buildEmailChatGptPrompt(topic: string, recipientName: string): string {
  const who = recipientName.trim() || "there";

  return `You are writing a complete, ready-to-send customer email for Montreal Spider Co., a bilingual (English + French) captive-bred tarantula shop in Montreal, Canada.

Write a full email to ${who} about: "${topic.trim() || "(enter a topic above, then copy this prompt again)"}"

Match the tone we use across the site and our species care guides: warm, knowledgeable, precise — never salesy, never over-the-top. Write like a small, passionate, professional shop, not a corporation.

Structure it EXACTLY like this, so it can be sent as-is:
1. Opening line: "Hi ${who}," on its own line, then a blank line.
2. Next line starts with "Thank you for reaching out —" and continues naturally into the topic (2–4 short paragraphs total, plain text, no markdown).
3. Blank line, then this exact closing line on its own: "If you have any other questions, we're here to help."
4. Blank line, then this exact sign-off on its own line: "The Montreal Spider Co. team."

Rules:
- Do not invent order numbers, prices, or stock facts — leave a bracketed placeholder like [price] if a specific detail is needed.
- Return ONLY the finished email text — no intro, no commentary, no quotation marks around it.

${STYLE_EXAMPLE}`;
}
