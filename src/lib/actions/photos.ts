"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function uploadProfilePhoto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const file = formData.get("file") as File | null;
  const isPrimary = formData.get("isPrimary") === "true";

  if (!file || file.size === 0) {
    return { error: "Aucun fichier sélectionné" };
  }

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return { error: "Format non supporté (JPEG, PNG, WebP uniquement)" };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "Fichier trop volumineux (max 5 Mo)" };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(path, file, { upsert: false });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("profile-photos").getPublicUrl(path);

  if (isPrimary) {
    await supabase
      .from("profile_photos")
      .update({ is_primary: false })
      .eq("profile_id", user.id);
  }

  const { data: existingPhotos } = await supabase
    .from("profile_photos")
    .select("id")
    .eq("profile_id", user.id);

  const shouldBePrimary =
    isPrimary || !existingPhotos || existingPhotos.length === 0;

  const { error: insertError } = await supabase.from("profile_photos").insert({
    profile_id: user.id,
    storage_path: path,
    url: publicUrl,
    is_primary: shouldBePrimary,
    sort_order: existingPhotos?.length ?? 0,
  });

  if (insertError) return { error: insertError.message };

  if (shouldBePrimary) {
    await supabase
      .from("profiles")
      .update({ primary_photo_url: publicUrl })
      .eq("id", user.id);
  }

  revalidatePath("/profil/photos");
  revalidatePath("/profil");
  revalidatePath("/tableau-de-bord");
  return { success: true, url: publicUrl };
}

export async function setPrimaryPhoto(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: photo } = await supabase
    .from("profile_photos")
    .select("url")
    .eq("id", photoId)
    .eq("profile_id", user.id)
    .single();

  if (!photo) return { error: "Photo introuvable" };

  await supabase
    .from("profile_photos")
    .update({ is_primary: false })
    .eq("profile_id", user.id);

  await supabase
    .from("profile_photos")
    .update({ is_primary: true })
    .eq("id", photoId);

  await supabase
    .from("profiles")
    .update({ primary_photo_url: photo.url })
    .eq("id", user.id);

  revalidatePath("/profil/photos");
  revalidatePath("/profil");
  return { success: true };
}

export async function deleteProfilePhoto(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: photo } = await supabase
    .from("profile_photos")
    .select("storage_path, is_primary")
    .eq("id", photoId)
    .eq("profile_id", user.id)
    .single();

  if (!photo) return { error: "Photo introuvable" };

  await supabase.storage.from("profile-photos").remove([photo.storage_path]);
  await supabase.from("profile_photos").delete().eq("id", photoId);

  if (photo.is_primary) {
    const { data: nextPhoto } = await supabase
      .from("profile_photos")
      .select("url")
      .eq("profile_id", user.id)
      .order("sort_order")
      .limit(1)
      .single();

    await supabase
      .from("profiles")
      .update({ primary_photo_url: nextPhoto?.url ?? null })
      .eq("id", user.id);
  }

  revalidatePath("/profil/photos");
  revalidatePath("/profil");
  return { success: true };
}
