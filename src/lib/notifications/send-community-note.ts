import { createAdminClient } from "@/lib/supabase/admin";
import { processPendingOutbox } from "@/lib/notifications/process-outbox";
import {
  communityNoteDay,
  communityNoteForDay,
} from "@/lib/notifications/community-notes";

export async function sendDailyCommunityNote(options?: { deliver?: boolean }) {
  const deliver = options?.deliver ?? true;
  const day = communityNoteDay();
  const note = communityNoteForDay(day);
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("send_daily_community_note", {
    p_title: note.title,
    p_content: note.content,
    p_day: day,
  });

  if (error) {
    throw new Error(error.message);
  }

  const delivery = deliver ? await processPendingOutbox(200) : null;

  return {
    day,
    title: note.title,
    sent: Number(data ?? 0),
    delivery,
  };
}
