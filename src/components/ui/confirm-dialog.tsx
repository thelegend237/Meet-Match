"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

function ConfirmDialogPanel({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmOptions & {
  open: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, pending, onCancel]);

  if (!open || !mounted) return null;

  const paragraphs = description
    ?.split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#2e1a47]/45 backdrop-blur-[2px]"
        aria-label="Fermer"
        disabled={pending}
        onClick={onCancel}
      />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(46,26,71,0.22)] sm:rounded-[1.25rem]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-desc" : undefined}
      >
        <div className="px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
          <div className="flex gap-4">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                destructive ? "bg-destructive/10 text-destructive" : "bg-secondary/10 text-secondary"
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="confirm-dialog-title"
                className="font-sans text-lg font-bold leading-snug text-primary"
              >
                {title}
              </h2>
              {paragraphs && paragraphs.length > 0 && (
                <div
                  id="confirm-dialog-desc"
                  className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground"
                >
                  {paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-full sm:min-w-[7.5rem]"
              disabled={pending}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={destructive ? "destructive" : "secondary"}
              className={cn(
                "rounded-full sm:min-w-[7.5rem]",
                destructive &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = useCallback(
    (value: boolean) => {
      if (actionPending) return;
      pending?.resolve(value);
      setPending(null);
    },
    [actionPending, pending]
  );

  const dialog = (
    <ConfirmDialogPanel
      open={pending !== null}
      title={pending?.title ?? ""}
      description={pending?.description}
      confirmLabel={pending?.confirmLabel}
      cancelLabel={pending?.cancelLabel}
      destructive={pending?.destructive}
      pending={actionPending}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
    />
  );

  return { confirm, dialog, setActionPending };
}
