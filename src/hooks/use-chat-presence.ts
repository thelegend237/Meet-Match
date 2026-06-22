"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  parseChatPresenceState,
  type ChatPresenceUser,
} from "@/lib/chat/presence";

interface UseChatPresenceOptions {
  chatId: string;
  userId: string;
  name: string;
  photo: string | null;
  isAdmin: boolean;
  enabled?: boolean;
}

export function useChatPresence({
  chatId,
  userId,
  name,
  photo,
  isAdmin,
  enabled = true,
}: UseChatPresenceOptions) {
  const [presentUsers, setPresentUsers] = useState<ChatPresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const syncState = useCallback((channel: RealtimeChannel) => {
    setPresentUsers(parseChatPresenceState(channel.presenceState()));
  }, []);

  useEffect(() => {
    if (!enabled || !chatId || !userId) {
      setPresentUsers([]);
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(`chat:${chatId}:presence`, {
      config: { presence: { key: userId } },
    });

    channelRef.current = channel;

    const payload = {
      user_id: userId,
      name,
      photo,
      is_admin: isAdmin,
      joined_at: new Date().toISOString(),
    };

    const track = async () => {
      if (document.visibilityState !== "visible") return;
      await channel.track({
        ...payload,
        joined_at: new Date().toISOString(),
      });
    };

    channel
      .on("presence", { event: "sync" }, () => syncState(channel))
      .on("presence", { event: "join" }, () => syncState(channel))
      .on("presence", { event: "leave" }, () => syncState(channel))
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await track();
        }
      });

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void track();
      } else {
        void channel.untrack();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void channel.untrack();
      void supabase.removeChannel(channel);
      channelRef.current = null;
      setPresentUsers([]);
    };
  }, [chatId, userId, name, photo, isAdmin, enabled, syncState]);

  return presentUsers;
}
