import EmailTemplatesForm from "@/components/admin/EmailTemplatesForm";
import { EMAIL_TEMPLATE_META } from "@/lib/email-templates";
import { emailConfigured } from "@/lib/email";

export default function AdminTemplatesPage() {
  return <EmailTemplatesForm templates={EMAIL_TEMPLATE_META} configured={emailConfigured} />;
}
