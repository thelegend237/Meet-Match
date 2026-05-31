import { BadgeCheck, Sparkles } from "lucide-react";
import {
  isNewMember,
  isProfileOnline,
  isVerifiedProfile,
} from "@/lib/discover/profile-status";
import type { DiscoveryProfile } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface ProfileCardBadgesProps {
  profile: Pick<
    DiscoveryProfile,
    "created_at" | "is_verified" | "last_seen_at"
  >;
  variant?: "overlay" | "inline";
  className?: string;
}

export function ProfileCardBadges({
  profile,
  variant = "overlay",
  className,
}: ProfileCardBadgesProps) {
  const online = isProfileOnline(profile.last_seen_at);
  const verified = isVerifiedProfile(profile);
  const isNew = isNewMember(profile.created_at);

  if (!online && !verified && !isNew) return null;

  const isOverlay = variant === "overlay";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        isOverlay ? "absolute left-2 top-2 z-10" : "",
        className
      )}
    >
      {online && (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full font-medium",
            isOverlay
              ? "bg-black/50 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm"
              : "bg-green-100 px-2 py-0.5 text-[10px] text-green-800"
          )}
          title="En ligne"
        >
          <span className="h-2 w-2 rounded-full bg-green-400" />
          En ligne
        </span>
      )}
      {verified && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full font-medium",
            isOverlay
              ? "bg-blue-600/90 px-2 py-0.5 text-[10px] text-white"
              : "bg-blue-100 px-2 py-0.5 text-[10px] text-blue-800"
          )}
          title="Compte vérifié"
        >
          <BadgeCheck className="h-3 w-3" />
          Vérifié
        </span>
      )}
      {isNew && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full font-medium",
            isOverlay
              ? "bg-white/95 px-2 py-0.5 text-[10px] text-primary"
              : "bg-secondary/10 px-2 py-0.5 text-[10px] text-secondary"
          )}
          title="Inscrit récemment"
        >
          <Sparkles className="h-3 w-3" />
          Nouveau
        </span>
      )}
    </div>
  );
}
