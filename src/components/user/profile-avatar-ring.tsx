"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const RING_SIZE = 88;
const STROKE = 4;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ProfileAvatarRingProps {
  photoUrl: string | null;
  displayName: string;
  completion: number;
  className?: string;
}

export function ProfileAvatarRing({
  photoUrl,
  displayName,
  completion,
  className,
}: ProfileAvatarRingProps) {
  const clamped = Math.min(100, Math.max(0, completion));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  const ringColor =
    clamped >= 100
      ? "stroke-green-500"
      : clamped >= 60
        ? "stroke-secondary"
        : "stroke-red-500";

  return (
    <Link
      href="/profil/photos"
      className={cn("relative inline-flex shrink-0", className)}
      aria-label="Modifier mes photos"
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-muted/50"
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          className={cn("transition-all duration-700", ringColor)}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="absolute inset-[6px] overflow-hidden rounded-full bg-muted">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={displayName}
            fill
            className="object-cover"
            sizes="76px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Camera className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      <span
        className={cn(
          "absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums shadow-sm",
          clamped >= 100
            ? "bg-green-500 text-white"
            : clamped >= 60
              ? "bg-secondary text-secondary-foreground"
              : "bg-red-500 text-white"
        )}
      >
        {clamped}%
      </span>
    </Link>
  );
}
