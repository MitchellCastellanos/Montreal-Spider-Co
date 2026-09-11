import "server-only";
import { prisma } from "@/lib/db";
import type { ContactMessage, ContactMessageStatus, ContactReply } from "@prisma/client";

export interface ContactReplyView {
  id: string;
  subject: string;
  body: string;
  createdAt: string;
}

export interface ContactMessageView {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  locale: string;
  status: ContactMessageStatus;
  createdAt: string;
  replies: ContactReplyView[];
}

type RowWithReplies = ContactMessage & { replies: ContactReply[] };

function mapRow(row: RowWithReplies): ContactMessageView {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    locale: row.locale,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    replies: row.replies.map((r) => ({
      id: r.id,
      subject: r.subject,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/** Persists a /contact submission so it shows up in Admin → Messages. */
export async function createContactMessage(input: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  locale: string;
}): Promise<void> {
  if (!prisma) return;
  await prisma.contactMessage.create({ data: input });
}

export async function listContactMessages(): Promise<ContactMessageView[]> {
  if (!prisma) return [];
  const rows = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });
  return rows.map(mapRow);
}

/** Records a sent reply and marks the message as replied. */
export async function recordContactReply(contactMessageId: string, subject: string, body: string): Promise<void> {
  if (!prisma) return;
  await prisma.$transaction([
    prisma.contactReply.create({ data: { contactMessageId, subject, body } }),
    prisma.contactMessage.update({ where: { id: contactMessageId }, data: { status: "replied" } }),
  ]);
}
