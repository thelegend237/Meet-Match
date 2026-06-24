"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { EyeOff } from "lucide-react";
import { hideChatForUserAction } from "@/lib/actions/chats";
import { ChatOverflowMenu } from "@/components/user/chat-overflow-menu";
import { toast } from "@/hooks/use-toast";

interface ChatHideButtonProps {
  chatId: string;
}

export function ChatHideButton({ chatId }: ChatHideButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleHide() {
    const confirmed = window.confirm(
      "Masquer cette conversation ?\n\n" +
        "Elle disparaîtra de votre liste. L'équipe Meet & Match conserve l'historique. " +
        "Elle réapparaîtra si vous recevez un nouveau message."
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await hideChatForUserAction(chatId);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
        return;
      }

      toast({
        title: "Conversation masquée",
        description: "Elle n'apparaît plus dans votre liste de messages.",
      });
      router.push("/messages");
      router.refresh();
    });
  }

  return (
    <ChatOverflowMenu
      pending={pending}
      items={[
        {
          id: "hide",
          label: "Masquer la discussion",
          icon: EyeOff,
          onClick: handleHide,
        },
      ]}
    />
  );
}
