import ContactInbox from "@/components/admin/ContactInbox";
import { listContactMessages } from "@/lib/data/contact-messages";
import { emailConfigured } from "@/lib/email";
import { listFromIdentities } from "@/lib/notifications/service";

export default async function AdminMessagesPage() {
  const messages = await listContactMessages();
  const fromOptions = listFromIdentities().map(({ id, label }) => ({ id, label }));
  return <ContactInbox messages={messages} configured={emailConfigured} fromOptions={fromOptions} />;
}
