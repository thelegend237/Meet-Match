import Link from "next/link";
import {
  Compass,
  CreditCard,
  User,
  Bell,
  Heart,
  MessageSquare,
} from "lucide-react";
import { requireUser, hasPlatformAccess } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import {
  ProfileCompletionBanner,
  PaymentRequiredBanner,
} from "@/components/user/profile-banners";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { profileStatusLabels } from "@/lib/admin/labels";

export const metadata = {
  title: "Tableau de bord",
};

export default async function DashboardPage() {
  const profile = await requireUser();
  const unreadCount = await getUnreadCount();
  const supabase = await createClient();

  const { count: likesSent } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("from_user_id", profile.id);

  const quickLinks = [
    { href: "/decouvrir", label: "Découvrir", icon: Compass, desc: "Parcourir les profils" },
    { href: "/matchs", label: "Mes matchs", icon: Heart, desc: "Mises en relation" },
    { href: "/messages", label: "Discussions", icon: MessageSquare, desc: "Messagerie accompagnée" },
    { href: "/profil", label: "Mon profil", icon: User, desc: `${profile.profile_completion}% complété` },
    { href: "/notifications", label: "Notifications", icon: Bell, desc: unreadCount > 0 ? `${unreadCount} non lue(s)` : "À jour" },
    { href: "/paiements", label: "Paiements", icon: CreditCard, desc: hasPlatformAccess(profile) ? "Accès actif" : "Inscription à payer" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-primary">
          Bonjour, {profile.display_name || "membre"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Bienvenue sur votre espace Meet & Match.
        </p>
      </div>

      <ProfileCompletionBanner profile={profile} />
      <PaymentRequiredBanner profile={profile} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition-all hover:border-secondary/30 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
                  <link.icon className="h-5 w-5 text-secondary" />
                </div>
                <h3 className="mt-3 font-semibold text-primary">{link.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{link.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <Heart className="h-8 w-8 text-secondary" />
          <div>
            <p className="font-medium text-primary">Likes envoyés</p>
            <p className="text-2xl font-bold text-secondary">{likesSent ?? 0}</p>
          </div>
          <Badge variant="outline" className="ml-auto">
            {profileStatusLabels[profile.status] ?? profile.status}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
