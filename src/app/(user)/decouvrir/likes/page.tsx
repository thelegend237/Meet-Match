import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser, hasPlatformAccess } from "@/lib/auth/session";
import { getMyLikedProfiles } from "@/lib/actions/likes";
import { MyLikesList } from "@/components/user/my-likes-list";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Mes likes",
};

export default async function MesLikesPage() {
  const profile = await requireUser();

  if (!hasPlatformAccess(profile)) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">
          Activez votre compte pour voir vos likes.
        </p>
        <Button variant="secondary" asChild>
          <Link href="/paiements">Activer mon compte</Link>
        </Button>
      </div>
    );
  }

  const likedProfiles = await getMyLikedProfiles();

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/decouvrir">
            <ArrowLeft className="h-4 w-4" />
            Découvrir
          </Link>
        </Button>
        <h1 className="font-serif text-2xl font-bold text-primary sm:text-3xl">
          Mes likes envoyés
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Les profils qui vous intéressent. Si l&apos;intérêt est partagé,
          l&apos;équipe pourra vous proposer une mise en relation.
        </p>
      </div>

      <MyLikesList profiles={likedProfiles} />
    </div>
  );
}
