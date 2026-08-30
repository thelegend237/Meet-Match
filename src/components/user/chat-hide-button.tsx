"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { EyeOff } from "lucide-react";
import { hideChatForUserAction } from "@/lib/actions/chats";
import { ChatOverflowMenu } from "@/components/user/chat-overflow-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";

interface ChatHideButtonProps {
  chatId: string;
}

export function ChatHideButton({ chatId }: ChatHideButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  async function handleHide() {
    const confirmed = await confirm({
      title: "Masquer cette conversation ?",
      description:
        "Elle disparaîtra de votre liste. L'équipe Meet & Match conserve l'historique. Elle réapparaîtra si vous recevez un nouveau message.",
      confirmLabel: "Masquer",
    });
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
    <>
      {dialog}
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
    </>
  );
}
