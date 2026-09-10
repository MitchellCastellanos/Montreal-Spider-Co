import "server-only";

export const telegramConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

/** Best-effort push to the operator's phone when a visitor needs a human. Never throws. */
export async function sendTelegramAlert(text: string): Promise<boolean> {
  if (!telegramConfigured) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("[chat/telegram] sendMessage failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[chat/telegram] sendMessage failed:", e);
    return false;
  }
}
