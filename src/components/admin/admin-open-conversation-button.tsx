"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { openAdminUserConversationAction } from "@/lib/actions/chats";
import { cn } from "@/lib/utils";

interface AdminOpenConversationButtonProps {
  userId: string;
  children: ReactNode;
  className?: string;
  title?: string;
  onOpened?: () => void;
}

export function AdminOpenConversationButton({
  userId,
  children,
  className,
  title,
  onOpened,
}: AdminOpenConversationButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await openAdminUserConversationAction(userId);
      if (result.error || !result.chatId) {
        window.alert(result.error ?? "Impossible d'ouvrir la conversation.");
        return;
      }
      onOpened?.();
      router.push(`/admin/conversations/${result.chatId}`);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title={title}
      className={cn(className, pending && "pointer-events-none opacity-70")}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="sr-only">Ouverture…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
