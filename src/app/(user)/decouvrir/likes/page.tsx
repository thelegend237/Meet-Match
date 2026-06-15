import { requireUser, hasPlatformAccess } from "@/lib/auth/session";
import { getMyLikedProfiles } from "@/lib/actions/likes";
import { MyLikesList } from "@/components/user/my-likes-list";
import { PageHeader, PageStack } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Heart } from "lucide-react";

export const metadata = {
  title: "Mes likes",
};

export default async function MesLikesPage() {
  const profile = await requireUser();

  if (!hasPlatformAccess(profile)) {
    return (
      <PageStack>
        <PageHeader
          title="Mes likes envoyés"
          backHref="/decouvrir"
          backLabel="Découvrir"
        />
        <EmptyState
          icon={Heart}
          title="Compte à activer"
          description="Activez votre compte pour voir les profils que vous avez likés."
          actionHref="/paiements"
          actionLabel="Activer mon compte"
        />
      </PageStack>
    );
  }

  const likedProfiles = await getMyLikedProfiles();

  return (
    <PageStack>
      <PageHeader
        title="Mes likes envoyés"
        description="Les profils qui vous intéressent. Si l'intérêt est partagé, l'équipe pourra vous proposer une mise en relation."
        backHref="/decouvrir"
        backLabel="Découvrir"
        action={
          likedProfiles.length > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fce7f3] px-4 py-2 text-sm font-semibold text-[#e91e8c]">
              <Heart className="h-4 w-4 fill-current" />
              {likedProfiles.length} like{likedProfiles.length > 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      />
      <MyLikesList profiles={likedProfiles} />
    </PageStack>
  );
}
