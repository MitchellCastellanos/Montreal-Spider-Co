import AdminChatInbox from "@/components/admin/AdminChatInbox";

type Params = { params: Promise<{ id: string }> };

export default async function AdminChatConversationPage({ params }: Params) {
  const { id } = await params;
  return <AdminChatInbox initialSelectedId={id} />;
}
