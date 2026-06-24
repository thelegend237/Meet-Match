"use client";

import { useRouter } from "next/navigation";
import {
  adminSoftDeleteChatAction,
  superadminHardDeleteChatAction,
} from "@/lib/actions/chats";
import { updateChatStatusAction } from "@/lib/actions/admin";
import { useAdminAction } from "@/hooks/use-admin-action";
import {
  Info,
  Lock,
  LockOpen,
  Trash2,
} from "lucide-react";
import {
  ChatOverflowMenu,
  type ChatMenuItem,
} from "@/components/user/chat-overflow-menu";

interface AdminChatControlsProps {
  chatId: string;
  status: "open" | "closed";
  actorRole: "admin" | "superadmin";
  isDeleted?: boolean;
  isMatchGroup?: boolean;
  matchId?: string | null;
}

export function AdminChatControls({
  chatId,
  status,
  actorRole,
  isDeleted = false,
  isMatchGroup = false,
  matchId,
}: AdminChatControlsProps) {
  const router = useRouter();
  const { pending, run } = useAdminAction();
  const isSuperadmin = actorRole === "superadmin";

  function toggleStatus() {
    const next = status === "open" ? "closed" : "open";
    void run(() => updateChatStatusAction(chatId, next), {
      success:
        next === "closed" ? "Discussion fermée." : "Discussion rouverte.",
    });
  }

  function softDelete() {
    const confirmed = window.confirm(
      "Supprimer cette conversation ?\n\n" +
        "Elle sera retirée des listes membres et administrateurs. " +
        "Seul un super administrateur pourra la supprimer définitivement de la base."
    );
    if (!confirmed) return;

    void run(() => adminSoftDeleteChatAction(chatId), {
      success: "Conversation supprimée.",
      onSuccess: () => {
        router.push("/admin/conversations");
        router.refresh();
      },
    });
  }

  function hardDelete() {
    const confirmed = window.confirm(
      "Supprimer DÉFINITIVEMENT cette conversation ?\n\n" +
        "Tous les messages et participants seront effacés de la base. " +
        "Cette action est irréversible."
    );
    if (!confirmed) return;

    void run(() => superadminHardDeleteChatAction(chatId), {
      success: "Conversation supprimée définitivement.",
      onSuccess: () => {
        router.push("/admin/conversations");
        router.refresh();
      },
    });
  }

  const items: ChatMenuItem[] = [];

  if (isMatchGroup && matchId) {
    items.push({
      id: "match-details",
      label: "Détails du match",
      icon: Info,
      onClick: () => router.push("/admin/matchs"),
    });
  }

  if (!isDeleted) {
    items.push({
      id: "toggle-status",
      label: status === "open" ? "Fermer la discussion" : "Rouvrir la discussion",
      icon: status === "open" ? Lock : LockOpen,
      onClick: toggleStatus,
    });

    items.push({
      id: "soft-delete",
      label: "Supprimer la discussion",
      icon: Trash2,
      onClick: softDelete,
    });
  }

  if (isSuperadmin) {
    items.push({
      id: "hard-delete",
      label: isDeleted
        ? "Effacer définitivement"
        : "Supprimer définitivement",
      icon: Trash2,
      destructive: true,
      onClick: hardDelete,
    });
  }

  return <ChatOverflowMenu items={items} pending={pending} />;
}
