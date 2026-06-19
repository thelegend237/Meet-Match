/**
 * Diagnostic découverte — npm run diagnose:discovery
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) throw new Error(".env.local manquant");
  const lines = readFileSync(path, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables Supabase manquantes");

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("\n=== DIAGNOSTIC DÉCOUVERTE ===\n");

  const { error: rpcAsService } = await admin.rpc("discover_profiles", {
    p_excluded_ids: [],
    p_limit: 5,
  });

  console.log("RPC discover_profiles (service role, auth.uid=null):");
  console.log(" ", rpcAsService?.message ?? "OK (unexpected without user)");

  const { data: allProfiles, error: profErr } = await admin
    .from("profiles")
    .select(
      "id, display_name, email, role, status, registration_payment_status, primary_photo_url, gender, is_deleted, created_at"
    )
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (profErr) {
    console.error("Erreur profiles:", profErr.message);
    return;
  }

  console.log(`\nProfils non supprimés: ${allProfiles?.length ?? 0}`);

  const users = (allProfiles ?? []).filter((p) => p.role === "user");
  const discoverable = users.filter(
    (p) =>
      p.status === "active" &&
      ["paid", "free"].includes(p.registration_payment_status) &&
      p.primary_photo_url
  );

  const { data: allPhotos } = await admin
    .from("profile_photos")
    .select("profile_id, url, is_primary");

  const photosByProfile = (allPhotos ?? []).reduce((acc, ph) => {
    acc[ph.profile_id] = (acc[ph.profile_id] ?? 0) + 1;
    return acc;
  }, {});

  const withGalleryOnly = users.filter(
    (p) =>
      !p.primary_photo_url &&
      (photosByProfile[p.id] ?? 0) > 0 &&
      p.status === "active" &&
      ["paid", "free"].includes(p.registration_payment_status)
  );

  console.log(`Membres (role=user): ${users.length}`);
  console.log(`Découvrables (active + payé/gratuit + photo): ${discoverable.length}`);
  if (withGalleryOnly.length > 0) {
    console.log(`⚠ Désync primary_photo_url (photos en galerie): ${withGalleryOnly.length}`);
    for (const p of withGalleryOnly) {
      console.log(`  → ${p.display_name || p.email} (${photosByProfile[p.id]} photo(s))`);
    }
  }

  const blockers = {
    pending: users.filter((p) => p.status === "pending").length,
    unpaid: users.filter((p) => p.registration_payment_status === "unpaid").length,
    noPhoto: users.filter((p) => !p.primary_photo_url).length,
    noGender: users.filter((p) => !p.gender).length,
    staff: (allProfiles ?? []).filter((p) => p.role !== "user").length,
  };
  console.log("\nBlocages potentiels (membres):");
  console.log(" ", blockers);

  console.log("\n--- Détail membres ---");
  for (const p of users.slice(0, 20)) {
    const ok =
      p.status === "active" &&
      ["paid", "free"].includes(p.registration_payment_status) &&
      !!p.primary_photo_url;
    console.log(
      `${ok ? "✓" : "✗"} ${p.display_name || p.email} | status=${p.status} | pay=${p.registration_payment_status} | photo=${p.primary_photo_url ? "oui" : photosByProfile[p.id] ? `galerie(${photosByProfile[p.id]})` : "non"} | gender=${p.gender ?? "null"}`
    );
  }

  const { data: matches } = await admin
    .from("matches")
    .select("user_a_id, user_b_id, status")
    .in("status", ["pending", "pending_payment", "active", "success"]);

  console.log(`\nMatchs actifs/pending (masquent des paires): ${matches?.length ?? 0}`);

  console.log("\n=== FIN ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
