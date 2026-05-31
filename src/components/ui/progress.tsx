import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
}

export function Progress({ value, className }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
    >
      <div
        className="h-full rounded-full bg-secondary transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function ProfileCompletionBar({
  value,
  showLabel = true,
}: {
  value: number;
  showLabel?: boolean;
}) {
  const label =
    value >= 100
      ? "Profil complet"
      : value >= 80
        ? "Profil utilisable"
        : value >= 40
          ? "Profil limité"
          : "Profil incomplet";

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-primary">{label}</span>
          <span className="text-muted-foreground">{value}%</span>
        </div>
      )}
      <Progress value={value} />
    </div>
  );
}
