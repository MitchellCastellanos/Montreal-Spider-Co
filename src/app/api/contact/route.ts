import { NextResponse } from "next/server";
import { sendNotification, notifyStaff } from "@/lib/notifications/service";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBJECT_LABELS: Record<string, string> = {
  general: "General question",
  order: "About my order",
  species: "Species advice",
  wholesale: "Wholesale / partnership",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  let body: { name?: string; email?: string; phone?: string; subject?: string; message?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 200);
  const email = (body.email ?? "").trim().slice(0, 320);
  const phone = (body.phone ?? "").trim().slice(0, 40);
  const message = (body.message ?? "").trim().slice(0, 5000);
  const subjectKey = body.subject ?? "general";
  const locale = body.locale === "fr" ? "fr" : "en";

  if (!name || !email || !message || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  const subjectLabel = SUBJECT_LABELS[subjectKey] ?? SUBJECT_LABELS.general;

  await notifyStaff({
    templateId: "internal-contact-message",
    event: "contact.submitted",
    data: {
      name: escapeHtml(name),
      email: escapeHtml(email),
      phone: escapeHtml(phone || "—"),
      subject: escapeHtml(subjectLabel),
      message: escapeHtml(message).replace(/\n/g, "<br />"),
    },
    context: { contactEmail: email },
  });

  await sendNotification({
    templateId: "contact-received",
    event: "contact.submitted",
    to: email,
    locale,
    data: { name },
    context: { contactEmail: email },
  });

  return NextResponse.json({ ok: true });
}
