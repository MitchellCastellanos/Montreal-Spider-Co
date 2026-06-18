import { getSettings } from "@/lib/data/settings";
import { hasDatabase } from "@/lib/db";
import SettingsForm from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return <SettingsForm settings={settings} editable={hasDatabase} />;
}
