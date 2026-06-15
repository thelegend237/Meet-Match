import { Badge } from "@/components/ui/badge";
import {
  profileStatusLabels,
  paymentStatusLabels,
  matchStatusLabels,
} from "@/lib/admin/labels";

type StatusKind = "profile" | "payment" | "match";

const variantMap: Record<string, "default" | "secondary" | "success" | "warning" | "outline"> = {
  active: "success",
  paid: "success",
  free: "success",
  success: "success",
  unpaid: "warning",
  pending: "warning",
  pending_payment: "warning",
  inactive: "outline",
  suspended: "secondary",
  failed: "secondary",
  cancelled: "outline",
  deleted: "secondary",
};

export function StatusBadge({
  kind,
  status,
  className,
}: {
  kind: StatusKind;
  status: string;
  className?: string;
}) {
  const labels =
    kind === "profile"
      ? profileStatusLabels
      : kind === "payment"
        ? paymentStatusLabels
        : matchStatusLabels;

  return (
    <Badge variant={variantMap[status] ?? "outline"} className={className}>
      {labels[status] ?? status}
    </Badge>
  );
}
