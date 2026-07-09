"use client";

import { Copy, Trash2, X } from "lucide-react";

interface MessageSelectionBarProps {
  count: number;
  canDelete: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function MessageSelectionBar({
  count,
  canDelete,
  onCopy,
  onDelete,
  onCancel,
}: MessageSelectionBarProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#ebe6f0] bg-white px-3 py-2 sm:px-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#5b3d8f] hover:bg-[#f3eef8]"
          aria-label="Annuler la sélection"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-[#2e1a47]">
          {count} sélectionné{count > 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onCopy}
          disabled={count === 0}
          className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-[#5b3d8f] transition-colors hover:bg-[#f3eef8] disabled:opacity-40"
        >
          <Copy className="h-4 w-4" />
          <span className="hidden sm:inline">Copier</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={count === 0 || !canDelete}
          className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-[#dc2626] transition-colors hover:bg-[#fef2f2] disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Supprimer</span>
        </button>
      </div>
    </div>
  );
}
