"use client";

import { createPortal } from "react-dom";
import {
  CheckSquare,
  Copy,
  Info,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Smile,
  Trash2,
} from "lucide-react";
import { QUICK_REACTIONS } from "@/lib/chat/emojis";
import { cn } from "@/lib/utils";

interface MessageActionMenuProps {
  visible: boolean;
  isMine: boolean;
  isPinned: boolean;
  canDelete: boolean;
  canEdit: boolean;
  onDismiss?: () => void;
  onReply: () => void;
  onTogglePin: () => void;
  onReact: () => void;
  onCopy: () => void;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onInfo: () => void;
  onQuickReact: (emoji: string) => void;
  onMoreEmojis: () => void;
}

export function MessageActionMenu({
  visible,
  isMine,
  isPinned,
  canDelete,
  canEdit,
  onDismiss,
  onReply,
  onTogglePin,
  onReact,
  onCopy,
  onSelect,
  onDelete,
  onEdit,
  onInfo,
  onQuickReact,
  onMoreEmojis,
}: MessageActionMenuProps) {
  if (!visible) return null;

  const content = (
    <>
      <div className="flex items-center justify-between gap-1 border-b border-[#f0ebf5] px-2 py-2.5 sm:py-2">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onQuickReact(emoji)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg transition-transform active:scale-95 hover:bg-[#f3eef8] sm:h-8 sm:w-8"
            aria-label={`Réagir avec ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          onClick={onMoreEmojis}
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-[#7b3d8f] transition-colors hover:bg-[#f3eef8] sm:h-8 sm:w-8"
          aria-label="Plus d'emojis"
          title="Plus d'emojis"
        >
          +
        </button>
      </div>

      <MenuItem icon={<Reply className="h-[18px] w-[18px] text-[#5b3d8f]" />} label="Répondre" onClick={onReply} />
      <MenuItem icon={<Smile className="h-[18px] w-[18px] text-[#5b3d8f]" />} label="Réagir" onClick={onReact} />
      {canEdit ? (
        <MenuItem
          icon={<Pencil className="h-[18px] w-[18px] text-[#5b3d8f]" />}
          label="Modifier"
          onClick={onEdit}
        />
      ) : null}
      <MenuItem icon={<Copy className="h-[18px] w-[18px] text-[#5b3d8f]" />} label="Copier" onClick={onCopy} />
      <MenuItem
        icon={
          isPinned ? (
            <PinOff className="h-[18px] w-[18px] text-[#e91e8c]" />
          ) : (
            <Pin className="h-[18px] w-[18px] text-[#5b3d8f]" />
          )
        }
        label={isPinned ? "Désépingler" : "Épingler"}
        onClick={onTogglePin}
      />
      <MenuItem
        icon={<CheckSquare className="h-[18px] w-[18px] text-[#5b3d8f]" />}
        label="Sélectionner"
        onClick={onSelect}
      />
      <MenuItem
        icon={<Info className="h-[18px] w-[18px] text-[#5b3d8f]" />}
        label="Infos du message"
        onClick={onInfo}
      />
      {canDelete ? (
        <MenuItem
          icon={<Trash2 className="h-[18px] w-[18px] text-[#dc2626]" />}
          label="Supprimer"
          onClick={onDelete}
          danger
        />
      ) : null}
    </>
  );

  const mobileSheet =
    typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[70] sm:hidden"
            role="presentation"
            onClick={onDismiss}
          >
            <div className="absolute inset-0 bg-black/40" aria-hidden />
            <div
              role="menu"
              className="absolute bottom-0 left-0 right-0 max-h-[min(85dvh,520px)] overflow-y-auto rounded-t-2xl border border-[#e8e0f0] bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(46,26,71,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              {content}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {mobileSheet}
      <div
        role="menu"
        className={cn(
          "absolute top-8 z-30 hidden w-52 overflow-hidden rounded-2xl border border-[#e8e0f0] bg-white shadow-[0_12px_32px_rgba(46,26,71,0.16)] sm:block",
          isMine ? "right-0" : "left-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-[#f7f4fb] sm:min-h-0",
        danger ? "text-[#dc2626] hover:bg-[#fef2f2]" : "text-[#2e1a47]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
