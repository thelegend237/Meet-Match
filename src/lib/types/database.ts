export type ProfileStatus =
  | "pending"
  | "inactive"
  | "active"
  | "suspended"
  | "deleted";

export type PaymentStatus =
  | "unpaid"
  | "paid"
  | "failed"
  | "refunded"
  | "free";

export type GenderType = "male" | "female" | "other" | "prefer_not_say";
export type GenderPreference = "male" | "female" | "both";
export type RelationshipType = "serious" | "friendship" | "marriage" | "other";
export type RelationScope = "local" | "national" | "international";
export type PaymentType = "registration" | "matching";

export type MatchStatus =
  | "pending"
  | "pending_payment"
  | "active"
  | "success"
  | "failed"
  | "cancelled";

export interface UserMatch {
  id: string;
  status: MatchStatus;
  proposed_at: string;
  activated_at: string | null;
  closed_at: string | null;
  chat_id: string | null;
  partner: {
    id: string;
    display_name: string;
    primary_photo_url: string | null;
    city: string | null;
    country_code: string | null;
  };
  myPayment: {
    id: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
  } | null;
  partnerHasPaid: boolean;
}

export interface Profile {
  id: string;
  display_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: GenderType | null;
  country_code: string | null;
  city: string | null;
  language: string | null;
  languages: string[];
  timezone: string | null;
  bio: string | null;
  expectations: string | null;
  relationship_type: RelationshipType | null;
  preferred_age_min: number | null;
  preferred_age_max: number | null;
  preferred_country_code: string | null;
  preferred_city: string | null;
  preferred_relation_scope: RelationScope | null;
  preferred_gender: GenderPreference;
  is_verified: boolean;
  last_seen_at: string | null;
  primary_photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded_at: string | null;
  status: ProfileStatus;
  profile_completion: number;
  registration_payment_status: PaymentStatus;
  role: "user" | "admin" | "superadmin";
  notify_email: boolean;
  notify_push: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  display_name: string;
  date_of_birth: string | null;
  country_code: string | null;
  city: string | null;
  language: string | null;
  languages?: string[] | null;
  primary_photo_url: string | null;
}

export interface DiscoveryProfile extends PublicProfile {
  bio: string | null;
  gender: GenderType | null;
  expectations: string | null;
  relationship_type: RelationshipType | null;
  created_at: string | null;
  is_verified: boolean;
  last_seen_at: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photos: string[];
  distance_km?: number | null;
}

/** Profil complet pour comparaison admin (matching) */
export interface AdminCompareProfile {
  id: string;
  display_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: GenderType | null;
  country_code: string | null;
  city: string | null;
  language: string | null;
  languages?: string[] | null;
  bio: string | null;
  expectations: string | null;
  relationship_type: RelationshipType | null;
  preferred_age_min: number | null;
  preferred_age_max: number | null;
  preferred_country_code: string | null;
  preferred_city: string | null;
  preferred_relation_scope: RelationScope | null;
  preferred_gender: GenderPreference | null;
  primary_photo_url: string | null;
  is_verified: boolean;
  registration_payment_status: PaymentStatus;
  profile_completion: number;
  status: ProfileStatus;
  photos: string[];
}

export type MatchProposalSource = "mutual" | "one_way" | "manual";

export interface MatchProposalPair {
  userAId: string;
  userBId: string;
  userAName: string;
  userBName: string;
  profileA: AdminCompareProfile;
  profileB: AdminCompareProfile;
  source: MatchProposalSource;
  /** Date du signal (like réciproque ou unidirectionnel) */
  signalAt?: string;
  /** Like unidirectionnel : qui a liké qui */
  likedByUserId?: string;
  likedToUserId?: string;
}

/** @deprecated Utiliser MatchProposalPair */
export type MutualLikePair = MatchProposalPair & {
  mutualAt: string;
  source: "mutual";
};

export interface AdminUserListItem {
  id: string;
  display_name: string;
  email: string;
  date_of_birth: string | null;
  primary_photo_url: string | null;
  status: ProfileStatus;
  profile_completion: number;
  registration_payment_status: PaymentStatus;
  city: string | null;
  country_code: string | null;
  is_verified: boolean;
  last_seen_at: string | null;
  created_at: string;
  likes_sent: number;
  likes_received: number;
  matches_total: number;
  matches_success: number;
  matches_active: number;
  matches_pending_payment: number;
  matches_pending: number;
  matches_failed: number;
  matches_cancelled: number;
  member_days: number;
  role: "user" | "admin" | "superadmin";
}

export interface AdminUserMatch {
  id: string;
  status: MatchStatus;
  proposed_at: string;
  activated_at: string | null;
  closed_at: string | null;
  partner: {
    id: string;
    display_name: string;
    primary_photo_url: string | null;
  };
}

export interface AdminUserDetail {
  profile: Profile;
  stats: {
    member_days: number;
    likes_sent: number;
    likes_received: number;
    messages_sent: number;
    matches_total: number;
    matches_success: number;
    matches_active: number;
    matches_by_status: Record<string, number>;
    unread_notifications: number;
    photos_count: number;
  };
  photos: string[];
  payments: Payment[];
  matchHistory: AdminUserMatch[];
  recentLikesSent: {
    user_id: string;
    name: string;
    photo: string | null;
    at: string;
  }[];
  recentLikesReceived: {
    user_id: string;
    name: string;
    photo: string | null;
    at: string;
  }[];
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  match_id: string | null;
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  created_at: string;
}

export interface ProfilePhoto {
  id: string;
  profile_id: string;
  storage_path: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: string[];
  reactedByMe: boolean;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  read_at?: string | null;
  reactions?: MessageReaction[];
}

export interface ChatSummary {
  id: string;
  type: "admin_contact" | "match_group";
  status: "open" | "closed";
  match_id: string | null;
  match_status: string | null;
  title: string;
  photo: string | null;
  last_message: { content: string; created_at: string } | null;
  unread_count?: number;
  /** Jusqu'à 2 photos pour les discussions match (avatars empilés) */
  avatar_urls?: (string | null)[];
  /** last_seen_at des membres hors staff, pour le badge « en ligne » */
  participant_last_seen_at?: (string | null)[];
}
