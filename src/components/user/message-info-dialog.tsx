"use client";

import { useEffect } from "react";
import { Check, CheckCheck, Pencil, Send, X } from "lucide-react";
import { formatFullDateTime } from "@/lib/chat/format";
import { groupMessageReactions } from "@/lib/chat/reactions";
import type { ChatMessage } from "@/lib/types/database";

interface MessageInfoDialogProps {
  message: ChatMessage;
  currentUserId: string;
  onClose: () => void;
}

export function MessageInfoDialog({
  message,
  currentUserId,
  onClose,
}: MessageInfoDialogProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isMine = message.sender_id === currentUserId;
  const isRead = Boolean(message.read_at);
  const reactions = groupMessageReactions(message.reactions ?? [], currentUserId);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Informations du message"
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ebe6f0] px-4 py-3">
          <h2 className="text-base font-bold text-[#2e1a47]">
            Infos du message
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#9b8fa8] hover:bg-[#f3eef8]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="rounded-xl border border-[#ebe6f0] bg-[#faf8fc] px-3 py-2.5">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#2e1a47]">
              {message.content}
            </p>
          </div>

          <div className="space-y-3">
            <InfoRow
              icon={<Send className="h-4 w-4 text-[#5b3d8f]" />}
              label="Envoyé"
              value={formatFullDateTime(message.created_at)}
            />

            {message.edited_at ? (
              <InfoRow
                icon={<Pencil className="h-4 w-4 text-[#5b3d8f]" />}
                label="Modifié"
                value={formatFullDateTime(message.edited_at)}
              />
            ) : null}

            {isMine ? (
              isRead && message.read_at ? (
                <InfoRow
                  icon={<CheckCheck className="h-4 w-4 text-[#e91e8c]" />}
                  label="Lu"
                  value={formatFullDateTime(message.read_at)}
                />
              ) : (
                <InfoRow
                  icon={<Check className="h-4 w-4 text-[#c4b5d0]" />}
                  label="Statut"
                  value="Distribué · pas encore lu"
                />
              )
            ) : null}
          </div>

          {reactions.length > 0 ? (
            <div className="border-t border-[#ebe6f0] pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9b8fa8]">
                Réactions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {reactions.map((reaction) => (
                  <span
                    key={reaction.emoji}
                    className="inline-flex items-center gap-1 rounded-full border border-[#e8e0f0] bg-white px-2 py-0.5 text-sm"
                  >
                    {reaction.emoji}
                    <span className="text-xs font-semibold text-[#2e1a47]">
                      {reaction.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f3eef8]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#9b8fa8]">{label}</p>
        <p className="text-sm text-[#2e1a47]">{value}</p>
      </div>
    </div>
  );
}
