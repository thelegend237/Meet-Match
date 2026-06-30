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

const DISCOVERY_STATUSES = ["active", "pending"];
const DISCOVERY_PAYMENTS = ["paid", "free", "unpaid"];
const HIDDEN_MATCH_STATUSES = [
  "pending",
  "pending_payment",
  "active",
  "success",
];

function isDiscoverable(profile, photosByProfile) {
  const hasPhoto =
    !!profile.primary_photo_url?.trim() ||
    (photosByProfile[profile.id] ?? 0) > 0;
  return (
    profile.role === "user" &&
    !profile.is_deleted &&
    DISCOVERY_STATUSES.includes(profile.status) &&
    DISCOVERY_PAYMENTS.includes(profile.registration_payment_status) &&
    hasPhoto
  );
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables Supabase manquantes");

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("\n=== DIAGNOSTIC DÉCOUVERTE (critères migration 035) ===\n");

  const { error: rpcAsService } = await admin.rpc("discover_profiles", {
    p_excluded_ids: [],
    p_limit: 5,
  });

  console.log("RPC discover_profiles (service role, auth.uid=null):");
  console.log(" ", rpcAsService?.message ?? "OK (unexpected without user)");

  const { data: allProfiles, error: profErr } = await admin
    .from("profiles")
    .select(
      "id, display_name, email, role, status, registration_payment_status, primary_photo_url, gender, preferred_gender, is_deleted, created_at"
    )
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (profErr) {
    console.error("Erreur profiles:", profErr.message);
    return;
  }

  const { data: allPhotos } = await admin
    .from("profile_photos")
    .select("profile_id, url, is_primary");

  const photosByProfile = (allPhotos ?? []).reduce((acc, ph) => {
    acc[ph.profile_id] = (acc[ph.profile_id] ?? 0) + 1;
    return acc;
  }, {});

  const users = (allProfiles ?? []).filter((p) => p.role === "user");
  const discoverable = users.filter((p) => isDiscoverable(p, photosByProfile));

  const withGalleryOnly = users.filter(
    (p) =>
      !p.primary_photo_url?.trim() &&
      (photosByProfile[p.id] ?? 0) > 0 &&
      isDiscoverable(p, photosByProfile)
  );

  console.log(`Profils non supprimés: ${allProfiles?.length ?? 0}`);
  console.log(`Membres (role=user): ${users.length}`);
  console.log(
    `Découvrables (active/pending + payé/gratuit/non payé + photo): ${discoverable.length}`
  );
  if (withGalleryOnly.length > 0) {
    console.log(
      `  dont photo uniquement en galerie (sans primary_photo_url): ${withGalleryOnly.length}`
    );
  }

  const blockers = {
    staff: (allProfiles ?? []).filter((p) => p.role !== "user").length,
    badStatus: users.filter((p) => !DISCOVERY_STATUSES.includes(p.status))
      .length,
    badPayment: users.filter(
      (p) => !DISCOVERY_PAYMENTS.includes(p.registration_payment_status)
    ).length,
    noPhoto: users.filter(
      (p) =>
        !p.primary_photo_url?.trim() && (photosByProfile[p.id] ?? 0) === 0
    ).length,
    noGender: discoverable.filter((p) => !p.gender).length,
  };
  console.log("\nBlocages potentiels:");
  console.log(" ", blockers);

  const { data: matches } = await admin
    .from("matches")
    .select("user_a_id, user_b_id, status")
    .in("status", HIDDEN_MATCH_STATUSES);

  console.log(
    `\nMatchs actifs/pending (masquent des paires): ${matches?.length ?? 0}`
  );

  console.log("\n--- Simulation par membre (pool RPC → filtre genre) ---");
  for (const viewer of users.slice(0, 25)) {
    const excluded = new Set();
    for (const m of matches ?? []) {
      if (m.user_a_id === viewer.id) excluded.add(m.user_b_id);
      if (m.user_b_id === viewer.id) excluded.add(m.user_a_id);
    }
    const pool = discoverable.filter(
      (p) => p.id !== viewer.id && !excluded.has(p.id)
    );
    const pref = viewer.preferred_gender || "both";
    const afterGender =
      pref === "both"
        ? pool.length
        : pool.filter((p) => p.gender === pref).length;
    if (pool.length <= 14) {
      console.log(
        `${viewer.display_name || viewer.email} | pref=${pref} | pool=${pool.length} | après genre=${afterGender} | matchs exclus=${excluded.size}`
      );
    }
  }

  console.log("\n--- Détail membres ---");
  for (const p of users.slice(0, 25)) {
    const ok = isDiscoverable(p, photosByProfile);
    console.log(
      `${ok ? "✓" : "✗"} ${p.display_name || p.email} | status=${p.status} | pay=${p.registration_payment_status} | photo=${p.primary_photo_url ? "oui" : photosByProfile[p.id] ? `galerie(${photosByProfile[p.id]})` : "non"} | gender=${p.gender ?? "null"}`
    );
  }

  console.log("\n=== FIN ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
