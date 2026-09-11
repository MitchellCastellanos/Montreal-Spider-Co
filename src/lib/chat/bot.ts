import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { SITE } from "@/lib/site";

export const botConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

const MODEL = process.env.ANTHROPIC_CHAT_MODEL || "claude-haiku-4-5-20251001";
const MAX_TOOL_TURNS = 3;

export type HistoryMessage = { sender: "visitor" | "bot" | "staff" | "system"; content: string };
export type BotResult = { reply: string; escalate: boolean; escalateReason?: string };

function systemPrompt(locale: string): string {
  const lang = locale === "fr" ? "French" : "English";
  return `You are the friendly customer-support assistant embedded on ${SITE.name} (${SITE.url}), a licensed tarantula breeder/seller in ${SITE.city}, ${SITE.region}, Canada. Visitors are pet keepers — beginners and experienced hobbyists alike.

Reply in ${lang} by default, but match the visitor's language if they write in another one. Keep replies short and conversational (2-4 sentences), no markdown headers or bullet lists unless genuinely clearer that way.

What you can help with: general tarantula care and husbandry questions, explaining how ordering/pickup/delivery works, the site's "Verified Origin" traceability program, and looking up a specific order's status (use the check_order_status tool — you need the order number and the email it was placed under).

What you must NOT do: never invent current stock, prices, or exact shipping/delivery dates — those change constantly. Instead point the visitor to ${SITE.url}/shop, ${SITE.url}/delivery or ${SITE.url}/pickup-points, or offer to get a human who can check.

Call the escalate_to_human tool (with a one-sentence reason a staff member will read) whenever: the visitor explicitly asks for a person/human/real staff; you don't know the answer; the question needs a judgment call (custom requests, complaints, anything account- or payment-specific beyond a basic order-status lookup); or the visitor seems frustrated. Don't be stingy about escalating — a quick handoff beats a wrong or vague answer. When you escalate, still send a short reassuring reply telling them a team member is joining.`;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "check_order_status",
    description: "Look up the status of a customer's order by order number and the email address it was placed under.",
    input_schema: {
      type: "object",
      properties: {
        orderNumber: { type: "string", description: "The order number, e.g. MSC-1042." },
        email: { type: "string", description: "The email address used to place the order." },
      },
      required: ["orderNumber", "email"],
    },
  },
  {
    name: "escalate_to_human",
    description: "Flag this conversation so a staff member joins and takes over personally.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "One short sentence of context for the staff member." },
      },
      required: ["reason"],
    },
  },
];

async function checkOrderStatus(orderNumber: string, email: string): Promise<string> {
  if (!prisma) return "Order lookup isn't available right now — a human will need to check manually.";
  const order = await prisma.order.findFirst({
    where: { orderNumber: orderNumber.trim(), email: { equals: email.trim(), mode: "insensitive" } },
    select: { status: true, statusDetail: true, method: true, createdAt: true },
  });
  if (!order) return "No order found matching that order number and email — double-check both, or a human can look it up.";
  return `status=${order.status}${order.statusDetail ? ` detail="${order.statusDetail}"` : ""} method=${order.method} placedOn=${order.createdAt.toISOString().slice(0, 10)}`;
}

function fallbackReply(locale: string): string {
  return locale === "fr"
    ? "Merci pour votre message ! Un membre de notre équipe va vous répondre sous peu."
    : "Thanks for your message! A member of our team will get back to you shortly.";
}

export async function runBotTurn(locale: string, history: HistoryMessage[]): Promise<BotResult> {
  if (!botConfigured) {
    return { reply: fallbackReply(locale), escalate: true, escalateReason: "Chat bot is not configured (missing ANTHROPIC_API_KEY)." };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.sender === "visitor" ? "user" : "assistant",
    content: m.content,
  }));

  let escalate = false;
  let escalateReason: string | undefined;

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        system: systemPrompt(locale),
        tools: TOOLS,
        messages,
      });
    } catch (e) {
      console.error("[chat/bot] Anthropic call failed:", e);
      return { reply: fallbackReply(locale), escalate: true, escalateReason: "Bot call failed." };
    }

    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      return { reply: text || fallbackReply(locale), escalate, escalateReason };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      if (use.name === "escalate_to_human") {
        escalate = true;
        escalateReason = (use.input as { reason?: string })?.reason;
        toolResults.push({ type: "tool_result", tool_use_id: use.id, content: "Acknowledged — staff has been alerted." });
      } else if (use.name === "check_order_status") {
        const input = use.input as { orderNumber?: string; email?: string };
        const result = input.orderNumber && input.email ? await checkOrderStatus(input.orderNumber, input.email) : "Missing order number or email.";
        toolResults.push({ type: "tool_result", tool_use_id: use.id, content: result });
      } else {
        toolResults.push({ type: "tool_result", tool_use_id: use.id, content: "Unknown tool.", is_error: true });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return {
    reply: locale === "fr" ? "Un membre de notre équipe prend le relais dans un instant." : "A team member is taking it from here.",
    escalate: true,
    escalateReason: escalateReason ?? "Bot reached its tool-call limit.",
  };
}
