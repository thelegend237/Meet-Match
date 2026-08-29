import { getCountryName } from "@/lib/geo/countries-data";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_USERS_FETCH_LIMIT } from "@/lib/discover/constants";
import type {
  AdminUserDetail,
  AdminUserListItem,
  AdminUserMatch,
  MatchStatus,
  Payment,
  PaymentStatus,
  Profile,
} from "@/lib/types/database";

function daysSince(dateStr: string): number {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86400000
  );
}

export async function getDistinctUserCountries(): Promise<
  { code: string; name: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("country_code")
    .eq("is_deleted", false)
    .not("country_code", "is", null)
    .limit(10000);

  const codes = [
    ...new Set(
      (data ?? [])
        .map((row) => row.country_code?.trim().toUpperCase())
        .filter((code): code is string => Boolean(code))
    ),
  ];

  return codes
    .map((code) => ({
      code,
      name: getCountryName(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export type AdminUserListResult = {
  users: AdminUserListItem[];
  totalRegistered: number;
  truncated: boolean;
};

/** Compteurs globaux légers (KPI admin). */
export async function getAdminUserCounts(): Promise<{
  total: number;
  active: number;
  withPlatformAccess: number;
}> {
  const supabase = await createClient();

  const [{ count: total }, { count: active }, { count: withPlatformAccess }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false)
        .eq("status", "active"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false)
        .in("registration_payment_status", ["paid", "free"]),
    ]);

  return {
    total: total ?? 0,
    active: active ?? 0,
    withPlatformAccess: withPlatformAccess ?? 0,
  };
}

function aggregateLikesAndMatches(
  userIds: string[],
  likes: { from_user_id: string; to_user_id: string }[],
  matches: { user_a_id: string; user_b_id: string; status: string }[]
) {
  const idSet = new Set(userIds);
  const likesSent = new Map<string, number>();
  const likesReceived = new Map<string, number>();

  for (const l of likes) {
    if (idSet.has(l.from_user_id)) {
      likesSent.set(l.from_user_id, (likesSent.get(l.from_user_id) ?? 0) + 1);
    }
    if (idSet.has(l.to_user_id)) {
      likesReceived.set(
        l.to_user_id,
        (likesReceived.get(l.to_user_id) ?? 0) + 1
      );
    }
  }

  const matchCount = new Map<string, number>();
  const successCount = new Map<string, number>();
  const activeCount = new Map<string, number>();
  const pendingPaymentCount = new Map<string, number>();
  const pendingCount = new Map<string, number>();
  const failedCount = new Map<string, number>();
  const cancelledCount = new Map<string, number>();

  for (const m of matches) {
    for (const uid of [m.user_a_id, m.user_b_id]) {
      if (!idSet.has(uid)) continue;
      matchCount.set(uid, (matchCount.get(uid) ?? 0) + 1);
      switch (m.status) {
        case "success":
          successCount.set(uid, (successCount.get(uid) ?? 0) + 1);
          break;
        case "active":
          activeCount.set(uid, (activeCount.get(uid) ?? 0) + 1);
          break;
        case "pending_payment":
          pendingPaymentCount.set(uid, (pendingPaymentCount.get(uid) ?? 0) + 1);
          break;
        case "pending":
          pendingCount.set(uid, (pendingCount.get(uid) ?? 0) + 1);
          break;
        case "failed":
          failedCount.set(uid, (failedCount.get(uid) ?? 0) + 1);
          break;
        case "cancelled":
          cancelledCount.set(uid, (cancelledCount.get(uid) ?? 0) + 1);
          break;
        default:
          break;
      }
    }
  }

  return {
    likesSent,
    likesReceived,
    matchCount,
    successCount,
    activeCount,
    pendingPaymentCount,
    pendingCount,
    failedCount,
    cancelledCount,
  };
}

export async function getUsersWithSummaryStats(): Promise<AdminUserListItem[]> {
  const result = await getUsersWithSummaryStatsPaginated();
  return result.users;
}

/** Liste admin : derniers inscrits + stats agrégées sur ce lot uniquement. */
export async function getUsersWithSummaryStatsPaginated(): Promise<AdminUserListResult> {
  const supabase = await createClient();

  const {
    data: users,
    count: totalRegistered,
    error: usersError,
  } = await supabase
    .from("profiles")
    .select(
      "id, display_name, email, date_of_birth, primary_photo_url, status, profile_completion, registration_payment_status, city, country_code, is_verified, last_seen_at, created_at, role",
      { count: "exact" }
    )
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(ADMIN_USERS_FETCH_LIMIT);

  if (usersError || !users?.length) {
    return {
      users: [],
      totalRegistered: totalRegistered ?? 0,
      truncated: (totalRegistered ?? 0) > ADMIN_USERS_FETCH_LIMIT,
    };
  }

  const userIds = users.map((u) => u.id);

  const [{ data: likesFrom }, { data: likesTo }, { data: matchesA }, { data: matchesB }] =
    await Promise.all([
      supabase.from("likes").select("from_user_id, to_user_id").in("from_user_id", userIds),
      supabase.from("likes").select("from_user_id, to_user_id").in("to_user_id", userIds),
      supabase
        .from("matches")
        .select("user_a_id, user_b_id, status")
        .in("user_a_id", userIds),
      supabase
        .from("matches")
        .select("user_a_id, user_b_id, status")
        .in("user_b_id", userIds),
    ]);

  const likesMap = new Map<string, { from_user_id: string; to_user_id: string }>();
  for (const l of [...(likesFrom ?? []), ...(likesTo ?? [])]) {
    likesMap.set(`${l.from_user_id}:${l.to_user_id}`, l);
  }

  const matchesMap = new Map<
    string,
    { user_a_id: string; user_b_id: string; status: string }
  >();
  for (const m of [...(matchesA ?? []), ...(matchesB ?? [])]) {
    matchesMap.set(`${m.user_a_id}:${m.user_b_id}:${m.status}`, m);
  }

  const {
    likesSent,
    likesReceived,
    matchCount,
    successCount,
    activeCount,
    pendingPaymentCount,
    pendingCount,
    failedCount,
    cancelledCount,
  } = aggregateLikesAndMatches(
    userIds,
    [...likesMap.values()],
    [...matchesMap.values()]
  );

  return {
    users: users.map((u) => ({
      ...u,
      is_verified: u.is_verified ?? false,
      likes_sent: likesSent.get(u.id) ?? 0,
      likes_received: likesReceived.get(u.id) ?? 0,
      matches_total: matchCount.get(u.id) ?? 0,
      matches_success: successCount.get(u.id) ?? 0,
      matches_active: activeCount.get(u.id) ?? 0,
      matches_pending_payment: pendingPaymentCount.get(u.id) ?? 0,
      matches_pending: pendingCount.get(u.id) ?? 0,
      matches_failed: failedCount.get(u.id) ?? 0,
      matches_cancelled: cancelledCount.get(u.id) ?? 0,
      member_days: daysSince(u.created_at),
    })) as AdminUserListItem[],
    totalRegistered: totalRegistered ?? users.length,
    truncated: (totalRegistered ?? 0) > ADMIN_USERS_FETCH_LIMIT,
  };
}

export async function getAdminUserDetail(
  userId: string
): Promise<AdminUserDetail | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .eq("is_deleted", false)
    .single();

  if (!profile) return null;

  const [
    { count: likesSent },
    { count: likesReceived },
    { data: likesSentList },
    { data: likesReceivedList },
    { data: matches },
    { count: messagesSent },
    { data: payments },
    { data: photos },
    { count: unreadNotifications },
  ] = await Promise.all([
    supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("from_user_id", userId),
    supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("to_user_id", userId),
    supabase
      .from("likes")
      .select("to_user_id, created_at")
      .eq("from_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("likes")
      .select("from_user_id, created_at")
      .eq("to_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("matches")
      .select("id, user_a_id, user_b_id, status, proposed_at, activated_at, closed_at")
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order("proposed_at", { ascending: false }),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("sender_id", userId),
    supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("profile_photos")
      .select("url, is_primary, sort_order")
      .eq("profile_id", userId)
      .order("sort_order"),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
  ]);

  const partnerIds = new Set<string>();
  for (const m of matches ?? []) {
    partnerIds.add(m.user_a_id === userId ? m.user_b_id : m.user_a_id);
  }
  for (const l of likesSentList ?? []) partnerIds.add(l.to_user_id);
  for (const l of likesReceivedList ?? []) partnerIds.add(l.from_user_id);

  const { data: partners } = partnerIds.size
    ? await supabase
        .from("profiles")
        .select("id, display_name, primary_photo_url")
        .in("id", [...partnerIds])
    : { data: [] };

  const partnerById = new Map(
    (partners ?? []).map((p) => [p.id, p])
  );

  const matchHistory: AdminUserMatch[] = (matches ?? []).map((m) => {
    const partnerId = m.user_a_id === userId ? m.user_b_id : m.user_a_id;
    const partner = partnerById.get(partnerId);
    return {
      id: m.id,
      status: m.status as MatchStatus,
      proposed_at: m.proposed_at,
      activated_at: m.activated_at,
      closed_at: m.closed_at,
      partner: {
        id: partnerId,
        display_name: partner?.display_name ?? "—",
        primary_photo_url: partner?.primary_photo_url ?? null,
      },
    };
  });

  const matchesByStatus = matchHistory.reduce<Record<string, number>>(
    (acc, m) => {
      acc[m.status] = (acc[m.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  return {
    profile: profile as Profile,
    stats: {
      member_days: daysSince(profile.created_at),
      likes_sent: likesSent ?? 0,
      likes_received: likesReceived ?? 0,
      messages_sent: messagesSent ?? 0,
      matches_total: matchHistory.length,
      matches_success: matchesByStatus.success ?? 0,
      matches_active: matchesByStatus.active ?? 0,
      matches_by_status: matchesByStatus,
      unread_notifications: unreadNotifications ?? 0,
      photos_count: photos?.length ?? 0,
    },
    photos: (photos ?? []).map((p) => p.url),
    payments: (payments as Payment[]) ?? [],
    matchHistory,
    recentLikesSent: (likesSentList ?? []).map((l) => ({
      user_id: l.to_user_id,
      name: partnerById.get(l.to_user_id)?.display_name ?? "—",
      photo: partnerById.get(l.to_user_id)?.primary_photo_url ?? null,
      at: l.created_at,
    })),
    recentLikesReceived: (likesReceivedList ?? []).map((l) => ({
      user_id: l.from_user_id,
      name: partnerById.get(l.from_user_id)?.display_name ?? "—",
      photo: partnerById.get(l.from_user_id)?.primary_photo_url ?? null,
      at: l.created_at,
    })),
  };
}
