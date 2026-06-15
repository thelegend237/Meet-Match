import { redirect } from "next/navigation";

export default function AdminMatchConversationsRedirect() {
  redirect("/admin/conversations?tab=matchs");
}
