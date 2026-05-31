import Link from "next/link";
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-page";
import { AdminStatsGrid } from "@/components/admin/admin-stats";
import { getAdminStats } from "@/lib/admin/stats";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  const quickLinks = [
    { href: "/admin/utilisateurs", label: "Gérer les utilisateurs" },
    { href: "/admin/matching", label: "Likes réciproques" },
    { href: "/admin/matchs", label: "Suivi des matchs" },
    { href: "/admin/paiements", label: "Paiements" },
    { href: "/admin/conversations", label: "Messages contact" },
    { href: "/admin/conversations/matchs", label: "Discussions matchs" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Vue générale"
        description="Indicateurs clés et accès rapide au backoffice Meet & Match."
      />

      <AdminStatsGrid stats={stats} />

      <AdminSectionCard title="Actions rapides">
        <div className="flex flex-wrap gap-3">
          {quickLinks.map((link) => (
            <Button key={link.href} variant="outline" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </div>
      </AdminSectionCard>
    </div>
  );
}
