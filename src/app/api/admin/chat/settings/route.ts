import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getChatSettings, updateChatSettings, type ChatSettings } from "@/lib/chat/settings";

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json({ settings: await getChatSettings() });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: Partial<ChatSettings>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const staffName = (body.staffName ?? "").trim();
  const hours = body.hours;
  if (!staffName) return NextResponse.json({ error: "Staff name required." }, { status: 400 });
  if (
    !hours ||
    typeof hours.enabled !== "boolean" ||
    !Array.isArray(hours.days) ||
    typeof hours.startHour !== "number" ||
    typeof hours.endHour !== "number"
  ) {
    return NextResponse.json({ error: "Invalid hours." }, { status: 400 });
  }

  const days = hours.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6);
  const startHour = Math.min(Math.max(Math.round(hours.startHour), 0), 23);
  const endHour = Math.min(Math.max(Math.round(hours.endHour), 0), 23);

  await updateChatSettings({ staffName, hours: { enabled: hours.enabled, days, startHour, endHour } });
  return NextResponse.json({ ok: true });
}
