import { redirect } from "next/navigation";
import { getOrCreateAdminUserChat } from "@/lib/admin/chats";
import { requireAdmin } from "@/lib/auth/session";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  const userId = new URL(request.url).searchParams.get("user");

  if (!userId) {
    redirect("/admin/conversations");
  }

  const chatId = await getOrCreateAdminUserChat(admin.id, userId);

  if (!chatId) {
    redirect("/admin/utilisateurs?message=conversation-error");
  }

  redirect(`/admin/conversations/${chatId}`);
}
