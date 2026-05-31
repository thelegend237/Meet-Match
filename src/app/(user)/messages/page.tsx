import { requireUser } from "@/lib/auth/session";
import { getUserChats } from "@/lib/user/chats";
import { ChatsList } from "@/components/user/chats-list";

export const metadata = {
  title: "Discussions",
};

export default async function MessagesPage() {
  const profile = await requireUser();
  const chats = await getUserChats(profile.id);

  return (
    <div className="-mx-4 flex min-h-[calc(100dvh-7rem)] flex-col sm:mx-0">
      <div className="shrink-0 px-4 py-4 sm:px-0">
        <h1 className="font-serif text-2xl font-bold text-primary">Discussions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vos conversations accompagnées
        </p>
      </div>
      <div className="flex-1 px-0 sm:px-0">
        <ChatsList chats={chats} />
      </div>
    </div>
  );
}
