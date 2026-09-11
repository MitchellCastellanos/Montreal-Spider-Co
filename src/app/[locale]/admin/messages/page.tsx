import ContactInbox from "@/components/admin/ContactInbox";
import { listContactMessages } from "@/lib/data/contact-messages";
import { emailConfigured } from "@/lib/email";

export default async function AdminMessagesPage() {
  const messages = await listContactMessages();
  return <ContactInbox messages={messages} configured={emailConfigured} />;
}
