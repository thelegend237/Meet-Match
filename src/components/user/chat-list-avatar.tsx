import Image from "next/image";
import { getInitials } from "@/lib/chat/format";
import { TEAM_AVATAR_URL } from "@/lib/chat/team";
import { cn } from "@/lib/utils";

interface ChatListAvatarProps {
  type: "admin_contact" | "match_group";
  title: string;
  photo?: string | null;
  avatarUrls?: (string | null)[];
  showOnline?: boolean;
  size?: "md" | "lg";
  className?: string;
}

const SIZE = {
  md: {
    single: "h-11 w-11 sm:h-12 sm:w-12",
    stack: "h-11 w-11 sm:h-12 sm:w-12",
    stackItem: "h-8 w-8 sm:h-9 sm:w-9",
    heart: "h-5 w-5",
    online: "h-2.5 w-2.5 sm:h-3 sm:w-3",
    imageSizes: "48px",
  },
  lg: {
    single: "h-16 w-16",
    stack: "h-16 w-16",
    stackItem: "h-11 w-11",
    heart: "h-7 w-7",
    online: "h-3.5 w-3.5",
    imageSizes: "64px",
  },
} as const;

function InitialsCircle({
  label,
  className,
  size = "md",
}: {
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-[#7b3d8f]/15 to-[#e91e8c]/15 font-bold text-[#5b3d8f]",
        size === "sm" ? "h-full w-full text-[10px]" : "h-full w-full text-sm",
        className
      )}
    >
      {label}
    </div>
  );
}

export function ChatListAvatar({
  type,
  title,
  photo,
  avatarUrls = [],
  showOnline,
  size = "lg",
  className,
}: ChatListAvatarProps) {
  const photos = avatarUrls.filter(Boolean) as string[];
  const isTeam = type === "admin_contact";
  const s = SIZE[size];

  if (isTeam) {
    const memberPhoto =
      photo && photo !== TEAM_AVATAR_URL ? photo : null;
    if (memberPhoto) {
      return (
        <div className={cn("relative shrink-0", s.single, className)}>
          <div className="relative h-full w-full overflow-hidden rounded-full">
            <Image
              src={memberPhoto}
              alt=""
              fill
              className="object-cover object-center"
              sizes={s.imageSizes}
            />
          </div>
          {showOnline && (
            <span
              className={cn(
                "absolute bottom-0 right-0 rounded-full border-2 border-white bg-[#22c55e]",
                s.online
              )}
            />
          )}
        </div>
      );
    }

    const teamPhoto = photo ?? TEAM_AVATAR_URL;
    return (
      <div className={cn("relative shrink-0", s.single, className)}>
        <div className="relative h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-[#7b3d8f] to-[#e91e8c] p-2">
          <Image
            src={teamPhoto}
            alt=""
            fill
            className="object-contain object-center"
            sizes={s.imageSizes}
          />
        </div>
        {showOnline && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-2 border-white bg-[#22c55e]",
              s.online
            )}
          />
        )}
      </div>
    );
  }

  if (photos.length >= 2) {
    return (
      <div className={cn("relative shrink-0", s.stack, className)}>
        <div
          className={cn(
            "absolute left-0 top-0 overflow-hidden rounded-full ring-2 ring-white",
            s.stackItem
          )}
        >
          <Image
            src={photos[0]}
            alt=""
            fill
            className="object-cover object-center"
            sizes={s.imageSizes}
          />
        </div>
        <div
          className={cn(
            "absolute bottom-0 right-0 overflow-hidden rounded-full ring-2 ring-white",
            s.stackItem
          )}
        >
          <Image
            src={photos[1]}
            alt=""
            fill
            className="object-cover object-center"
            sizes={s.imageSizes}
          />
        </div>
      </div>
    );
  }

  if (photo || photos[0]) {
    return (
      <div className={cn("relative shrink-0", s.single, className)}>
        <div className="relative h-full w-full overflow-hidden rounded-full">
          <Image
            src={photo ?? photos[0]!}
            alt=""
            fill
            className="object-cover object-center"
            sizes={s.imageSizes}
          />
        </div>
        {showOnline && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-2 border-white bg-[#22c55e]",
              s.online
            )}
          />
        )}
      </div>
    );
  }

  if (type === "match_group" && title.includes("&")) {
    const [a, b] = title.split("&").map((part) => part.trim());
    return (
      <div className={cn("relative shrink-0", s.stack, className)}>
        <div
          className={cn(
            "absolute left-0 top-0 overflow-hidden rounded-full ring-2 ring-white",
            s.stackItem
          )}
        >
          <InitialsCircle label={getInitials(a ?? "?").slice(0, 2)} size="sm" />
        </div>
        <div
          className={cn(
            "absolute bottom-0 right-0 overflow-hidden rounded-full ring-2 ring-white",
            s.stackItem
          )}
        >
          <InitialsCircle label={getInitials(b ?? "?").slice(0, 2)} size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0", s.single, className)}>
      <div className="relative h-full w-full overflow-hidden rounded-full">
        <InitialsCircle label={getInitials(title)} />
      </div>
      {showOnline && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-white bg-[#22c55e]",
            s.online
          )}
        />
      )}
    </div>
  );
}
