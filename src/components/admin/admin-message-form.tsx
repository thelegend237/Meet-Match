"use client";

import { useRef } from "react";
import { sendAdminMessage } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAction } from "@/hooks/use-admin-action";

export function AdminMessageForm({ chatId }: { chatId: string }) {
  const { pending, run } = useAdminAction();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    const content = String(formData.get("content") ?? "").trim();
    if (!content) return;

    const result = await run(
      () => sendAdminMessage(chatId, content),
      { success: "Message envoyé." }
    );

    if (!result.error) {
      formRef.current?.reset();
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      <Textarea
        name="content"
        placeholder="Votre réponse..."
        rows={3}
        required
        disabled={pending}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi..." : "Envoyer"}
      </Button>
    </form>
  );
}
