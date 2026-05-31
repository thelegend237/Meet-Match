import { requireUser } from "@/lib/auth/session";
import { ProfileEditList } from "@/components/user/profile-edit-list";

export const metadata = {
  title: "Modifier le profil",
};

export default async function ProfilModifierPage() {
  const profile = await requireUser();
  return <ProfileEditList profile={profile} />;
}
