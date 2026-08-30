import { Loader2 } from "lucide-react";
import { PageStack } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageSpinner({
  label = "Chargement…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function PageHeaderSkeleton({ withBack = false }: { withBack?: boolean }) {
  return (
    <header className="space-y-3">
      {withBack && <Skeleton className="h-5 w-24" />}
      <Skeleton className="h-8 w-56 max-w-full sm:h-9" />
      <Skeleton className="h-4 w-full max-w-xl" />
    </header>
  );
}

function CardBlockSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="mm-card space-y-4 p-5 sm:p-6">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mm-card overflow-hidden">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SwipeDeckSkeleton() {
  return (
    <div className="relative mx-auto mt-4 aspect-[3/4] w-full max-w-md">
      <Skeleton className="absolute inset-0 rounded-[2rem]" />
      <Skeleton className="absolute inset-3 rounded-[1.75rem] opacity-60" />
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-6">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="h-14 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <PageStack className="gap-4">
      <PageHeaderSkeleton />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <CardBlockSkeleton rows={3} />
      <div className="mm-card p-5 sm:p-6">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
      <DashboardNotificationsSkeleton />
    </PageStack>
  );
}

export function DashboardNotificationsSkeleton() {
  return (
    <div className="mm-card lg:col-span-2">
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="divide-y divide-border/40 px-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiscoverPageSkeleton() {
  return (
    <PageStack className="gap-4">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <SwipeDeckSkeleton />
    </PageStack>
  );
}

export function LikesPageSkeleton() {
  return (
    <PageStack className="gap-4">
      <PageHeaderSkeleton withBack />
      <CardBlockSkeleton rows={1} />
      <ProfileGridSkeleton count={4} />
    </PageStack>
  );
}

export function MatchsPageSkeleton() {
  return (
    <PageStack className="gap-4">
      <PageHeaderSkeleton />
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="mm-card space-y-4 p-5 sm:p-6">
            <div className="flex gap-4">
              <Skeleton className="h-20 w-20 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full max-w-sm" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        ))}
      </div>
    </PageStack>
  );
}

export function RencontresPageSkeleton() {
  return (
    <PageStack className="gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <SwipeDeckSkeleton />
    </PageStack>
  );
}

export function UserPageSkeleton() {
  return (
    <PageStack className="gap-4">
      <PageHeaderSkeleton />
      <CardBlockSkeleton rows={2} />
    </PageStack>
  );
}

function AdminFilterBarSkeleton() {
  return (
    <div className="mm-admin-filter-bar space-y-4">
      <Skeleton className="h-11 w-full max-w-md rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function AdminTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="mm-card overflow-hidden">
      <div className="border-b border-border/50 px-5 py-4">
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="divide-y divide-border/40">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminTablePageSkeleton() {
  return (
    <PageStack className="gap-4">
      <PageHeaderSkeleton />
      <AdminFilterBarSkeleton />
      <AdminTableSkeleton />
    </PageStack>
  );
}

export function AdminMatchsPageSkeleton() {
  return (
    <PageStack className="gap-4">
      <PageHeaderSkeleton />
      <Skeleton className="h-10 w-full max-w-lg rounded-xl" />
      <AdminFilterBarSkeleton />
      <AdminTableSkeleton rows={6} />
      <CardBlockSkeleton rows={2} />
    </PageStack>
  );
}

export function AdminConversationsPageSkeleton() {
  return (
    <PageStack className="gap-4">
      <PageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="mm-card space-y-3 p-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 py-2">
              <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="hidden min-h-[420px] rounded-2xl lg:block" />
      </div>
    </PageStack>
  );
}

export function AdminMatchingPageSkeleton() {
  return (
    <PageStack className="gap-4">
      <PageHeaderSkeleton />
      <Skeleton className="h-10 w-full max-w-xl rounded-xl" />
      <CardBlockSkeleton rows={4} />
    </PageStack>
  );
}

export function AdminNotificationsPageSkeleton() {
  return (
    <PageStack className="gap-4">
      <PageHeaderSkeleton />
      <CardBlockSkeleton rows={4} />
    </PageStack>
  );
}
