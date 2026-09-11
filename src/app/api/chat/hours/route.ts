import { NextResponse } from "next/server";
import { getChatSettings, isWithinChatHours } from "@/lib/chat/settings";

/** Public — the widget checks this before deciding whether "talk to a human" goes live or offline. */
export async function GET() {
  const settings = await getChatSettings();
  return NextResponse.json({ withinHours: isWithinChatHours(settings.hours) });
}
