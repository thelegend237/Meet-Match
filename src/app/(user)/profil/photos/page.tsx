import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PhotoUpload } from "@/components/user/photo-upload";
import { Button } from "@/components/ui/button";
import type { ProfilePhoto } from "@/lib/types/database";

export const metadata = {
  title: "Mes photos",
};

export default async function PhotosPage() {
  await requireUser();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: photos } = await supabase
    .from("profile_photos")
    .select("*")
    .eq("profile_id", user!.id)
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold text-primary sm:text-3xl">Mes photos</h1>
          <p className="mt-2 text-muted-foreground">
            Ajoutez une photo principale pour rendre votre profil visible.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/profil">Retour au profil</Link>
        </Button>
      </div>
      <PhotoUpload photos={(photos as ProfilePhoto[]) ?? []} />
    </div>
  );
}
