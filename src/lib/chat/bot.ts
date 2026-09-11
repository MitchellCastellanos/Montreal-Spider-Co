import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { SITE } from "@/lib/site";
import { getStorefrontProducts } from "@/lib/data/products";
import { basePrice, totalStock, type Experience, type SpiderType, type Temperament } from "@/lib/types";
import type { ProductCard } from "@/lib/chat/types";

export const botConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

const MODEL = process.env.ANTHROPIC_CHAT_MODEL || "claude-haiku-4-5-20251001";
const MAX_TOOL_TURNS = 5;

export type HistoryMessage = { sender: "visitor" | "bot" | "staff" | "system"; content: string };
export type BotResult = { reply: string; escalate: boolean; escalateReason?: string; products?: ProductCard[] };

function systemPrompt(locale: string, visitorName?: string): string {
  const lang = locale === "fr" ? "French" : "English";
  const nameLine = visitorName ? `\n\nThe visitor's name is ${visitorName} — feel free to address them by it, naturally, not in every message.` : "";
  return `You are the friendly customer-support assistant embedded on ${SITE.name} (${SITE.url}), a licensed tarantula breeder/seller in ${SITE.city}, ${SITE.region}, Canada. Visitors are pet keepers — beginners and experienced hobbyists alike.${nameLine}

Reply in ${lang} by default, but match the visitor's language if they write in another one. Keep replies SHORT — 1-3 sentences, plain conversational prose. Never use markdown (no **bold**, no _italics_, no bullet/dash lists, no headers) — the chat window displays raw text, so markdown syntax shows up as literal asterisks and dashes and looks broken. If you're naming a couple of options inline, just write them into a sentence ("the Curly Hair and Red Rump are both great picks for that").

What you can help with: general tarantula care and husbandry questions, explaining how ordering/pickup/delivery works, the site's "Verified Origin" traceability program, recommending specimens we actually have in stock right now (use the search_inventory tool — always call it before recommending or quoting a price, never guess from memory since stock changes constantly), and looking up a specific order's status (use the check_order_status tool — you need the order number and the email it was placed under).

When a visitor describes what they want, call search_inventory to see what's actually in stock. Its structural filters (experience/type/temperament/maxPrice) are reliable — use whichever apply. Its keyword filter is ONLY a literal substring match against genus/scientific/common name, so it does NOT understand descriptive or judgment-based asks like "giant," "colorful," or "great for a kid" — passing those phrases as the keyword will return nothing, even when we clearly do have a great fit in stock. For that kind of ask: call search_inventory with just the structural filters (or none) to see the real in-stock list, then use your own tarantula-keeping knowledge to judge which of THOSE ACTUAL RESULTS best fits. Only use the keyword field when the visitor actually named a genus, species, or common name. If a first search comes back empty or unconvincing, broaden it (drop a filter, try a different genus guess) before concluding nothing fits — don't give up and punt to browsing ${SITE.url}/shop after a single empty keyword search when the real inventory list might well have a good answer.

Growth speed specifically is a common ask and easy to get backwards, so be careful: Lasiodora, Nhandu, Pamphobeteus, and Acanthoscurria species (e.g. a "Brazilian White Knee" is usually Acanthoscurria geniculata) are well known among keepers for comparatively FAST growth. Grammostola, Brachypelma, Aphonopelma, and any "curly hair" type (Tliltocatl albopilosus) are well known for being notably SLOW growers — despite several of those being great beginner picks for other reasons (temperament, hardiness), don't recommend them for a fast-growth ask specifically.

Once you've judged the best fit from real results, call recommend_products with ONLY those slugs, in priority order (best match first): this is what actually renders as photo cards for the visitor, so it must exactly match what you're about to say. Never call recommend_products with the whole search result set as a fallback — if you're recommending one, send one slug. IMPORTANT: calling recommend_products is not itself a reply — it only produces the cards. After it resolves, you MUST still send your normal text response; never end a turn as just a tool call with no accompanying text. In that text, name the pick(s) and give one short, friendly reason each ties back to what the visitor actually asked — temperament, care difficulty, growth rate, or a standout trait (e.g. "the White Knee grows fast for a New World species and is still pretty easy to care for"). Keep it to 1-3 sentences total and skip the price/exact stock count (the card already shows that), but the "why" itself is exactly what makes this feel like a real recommendation, so don't cut it down to a bare product name. If, after genuinely broadening the search, nothing in stock fits, say so in one sentence and suggest browsing ${SITE.url}/shop. Never invent exact shipping/delivery dates — point to ${SITE.url}/delivery or ${SITE.url}/pickup-points, or offer a human.

Call the escalate_to_human tool (with a one-sentence reason a staff member will read) whenever: the visitor explicitly asks for a person/human/real staff; you don't know the answer; the question needs a judgment call (custom requests, complaints, anything account- or payment-specific beyond a basic order-status lookup); or the visitor seems frustrated. Don't be stingy about escalating — a quick handoff beats a wrong or vague answer. When you escalate, still send a short reassuring reply telling them a team member is joining.`;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_inventory",
    description:
      "Search Montreal Spider Co.'s live, current stock of tarantulas for sale — real prices and quantities, not a catalog. Use this whenever recommending a species or answering what's in stock / how much something costs. All filters are optional and combine together; omit ones the visitor didn't specify.",
    input_schema: {
      type: "object",
      properties: {
        experience: { type: "string", enum: ["beginner", "intermediate", "advanced"], description: "Keeper experience level the species suits." },
        type: { type: "string", enum: ["terrestrial", "arboreal", "fossorial"] },
        temperament: { type: "string", enum: ["docile", "skittish", "defensive"] },
        keyword: {
          type: "string",
          description:
            "LITERAL substring match against genus, scientific name, or common name only, e.g. \"Grammostola\" or \"golden knee\" — it does NOT understand descriptive terms like \"fast-growing\" or \"giant\". Leave empty and rely on the structural filters (or judge the unfiltered results yourself) for that kind of ask.",
        },
        maxPrice: { type: "number", description: "Maximum price in CAD." },
        limit: { type: "number", description: "Max results to return, default 5, max 8." },
      },
    },
  },
  {
    name: "recommend_products",
    description:
      "Choose which specimen(s) to actually show the visitor as photo cards — this is what renders, in this exact order, right under your reply. Call it after search_inventory, with only the slug(s) you're genuinely recommending (usually 1, at most 3), best match first. It must match what your text says — don't dump the full search result set here.",
    input_schema: {
      type: "object",
      properties: {
        slugs: {
          type: "array",
          items: { type: "string" },
          description: "Product slugs from search_inventory results, in priority order (best match first).",
        },
      },
      required: ["slugs"],
    },
  },
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

async function searchInventory(args: {
  experience?: Experience;
  type?: SpiderType;
  temperament?: Temperament;
  keyword?: string;
  maxPrice?: number;
  limit?: number;
}): Promise<string> {
  const products = await getStorefrontProducts();
  let results = products.filter((p) => totalStock(p) > 0);

  if (args.experience) results = results.filter((p) => p.experience === args.experience);
  if (args.type) results = results.filter((p) => p.type === args.type);
  if (args.temperament) results = results.filter((p) => p.temperament === args.temperament);
  if (typeof args.maxPrice === "number") results = results.filter((p) => basePrice(p) <= args.maxPrice!);
  if (args.keyword?.trim()) {
    const kw = args.keyword.trim().toLowerCase();
    results = results.filter(
      (p) => p.scientific.toLowerCase().includes(kw) || p.genus.toLowerCase().includes(kw) || p.common.en.toLowerCase().includes(kw),
    );
  }

  results = results.sort((a, b) => basePrice(a) - basePrice(b)).slice(0, Math.min(Math.max(args.limit ?? 5, 1), 8));

  if (results.length === 0) return "No specimens currently in stock match those filters.";

  return results
    .map(
      (p) =>
        `slug=${p.slug} — ${p.common.en} (${p.scientific}) — ${p.experience}, ${p.type}, ${p.temperament} temperament — from $${basePrice(p).toFixed(2)} CAD, ${totalStock(p)} in stock`,
    )
    .join("\n");
}

/** What actually renders as cards — the model's explicit pick(s), in its chosen order, not the raw search results. */
async function recommendProducts(locale: string, slugs: string[]): Promise<{ text: string; products: ProductCard[] }> {
  if (!slugs?.length) return { text: "No slugs given.", products: [] };

  const storefront = await getStorefrontProducts();
  const bySlug = new Map(storefront.map((p) => [p.slug, p]));

  const products: ProductCard[] = [];
  for (const slug of slugs) {
    const p = bySlug.get(slug.trim());
    if (!p || totalStock(p) === 0) continue;
    products.push({
      slug: p.slug,
      name: p.common.en,
      price: basePrice(p),
      image: p.image ?? null,
      url: `${SITE.url}/${locale}/product/${p.slug}`,
    });
  }

  if (products.length === 0) return { text: "None of those slugs matched current stock — call search_inventory again.", products: [] };
  return { text: `Shown to the visitor as cards: ${products.map((p) => p.name).join(", ")}.`, products };
}

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

/** Used only if the model calls recommend_products but then returns no text — happens occasionally. Never blame this on staff needing to step in; the recommendation itself worked fine. */
function fallbackProductReply(locale: string, products: ProductCard[]): string {
  const first = products[0]?.name;
  if (!first) return fallbackReply(locale);
  return locale === "fr" ? `Voici une belle option : ${first} — jetez un coup d'œil ci-dessous !` : `Here's a great pick: ${first} — check it out below!`;
}

export async function runBotTurn(locale: string, history: HistoryMessage[], visitorName?: string): Promise<BotResult> {
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
  let products: ProductCard[] | undefined;

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        system: systemPrompt(locale, visitorName),
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
      const reply = text || (products?.length ? fallbackProductReply(locale, products) : fallbackReply(locale));
      return { reply, escalate, escalateReason, products };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      if (use.name === "search_inventory") {
        const text = await searchInventory(use.input as Parameters<typeof searchInventory>[0]);
        toolResults.push({ type: "tool_result", tool_use_id: use.id, content: text });
      } else if (use.name === "recommend_products") {
        const input = use.input as { slugs?: string[] };
        const result = await recommendProducts(locale, input.slugs ?? []);
        products = result.products;
        toolResults.push({ type: "tool_result", tool_use_id: use.id, content: result.text });
      } else if (use.name === "escalate_to_human") {
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
    products,
  };
}
