#!/usr/bin/env node
/**
 * Supprime les comptes de test (@test.com / @meetandmatch.test)
 * et leurs données liées. Conserve les vrais inscrits et admins.
 *
 * Prérequis : .env.local avec NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage :
 *   node scripts/cleanup-test-users.mjs --dry-run
 *   node scripts/cleanup-test-users.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, ".env.local");
const dryRun = process.argv.includes("--dry-run");

function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    throw new Error(".env.local introuvable à la racine du projet");
  }
  const env = {};
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function isTestEmail(email) {
  const value = (email || "").toLowerCase();
  return (
    value.endsWith("@test.com") || value.endsWith("@meetandmatch.test")
  );
}

async function del(supabase, table, column, ids, extra = {}) {
  if (!ids.length) return 0;
  let query = supabase.from(table).delete({ count: "exact" }).in(column, ids);
  for (const [key, value] of Object.entries(extra)) {
    query = query.eq(key, value);
  }
  const { error, count } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis"
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, is_deleted");
  if (profilesError) throw new Error(profilesError.message);

  const testUsers = (profiles ?? []).filter((p) => isTestEmail(p.email));
  const testIds = testUsers.map((p) => p.id);

  console.log(`${testUsers.length} compte(s) test trouvé(s) :`);
  for (const user of testUsers) {
    console.log(
      `  - ${user.email} (${user.display_name || "—"}) role=${user.role} deleted=${user.is_deleted}`
    );
  }

  if (!testIds.length) {
    console.log("Rien à supprimer.");
    return;
  }

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, user_a_id, user_b_id, proposed_by");
  if (matchesError) throw new Error(matchesError.message);

  const testMatchIds = (matches ?? [])
    .filter(
      (m) =>
        testIds.includes(m.user_a_id) ||
        testIds.includes(m.user_b_id) ||
        testIds.includes(m.proposed_by)
    )
    .map((m) => m.id);

  const [{ data: participantChats }, { data: creatorChats }, { data: matchChats }] =
    await Promise.all([
      supabase
        .from("chat_participants")
        .select("chat_id")
        .in("user_id", testIds),
      supabase.from("chats").select("id").in("created_by", testIds),
      testMatchIds.length
        ? supabase.from("chats").select("id").in("match_id", testMatchIds)
        : Promise.resolve({ data: [] }),
    ]);

  const chatIds = [
    ...new Set(
      [
        ...(participantChats ?? []).map((c) => c.chat_id),
        ...(creatorChats ?? []).map((c) => c.id),
        ...(matchChats ?? []).map((c) => c.id),
      ].filter(Boolean)
    ),
  ];

  console.log(`Matchs liés : ${testMatchIds.length}`);
  console.log(`Discussions liées : ${chatIds.length}`);

  if (dryRun) {
    console.log("--dry-run : aucune suppression.");
    return;
  }

  const summary = {};

  if (chatIds.length) {
    summary.message_reactions = await del(
      supabase,
      "message_reactions",
      "user_id",
      testIds
    );
    const { data: messages } = await supabase
      .from("messages")
      .select("id")
      .in("chat_id", chatIds);
    const messageIds = (messages ?? []).map((m) => m.id);
    if (messageIds.length) {
      summary.message_reactions_by_message = await del(
        supabase,
        "message_reactions",
        "message_id",
        messageIds
      );
    }
    summary.messages = await del(supabase, "messages", "chat_id", chatIds);
    summary.chat_participants = await del(
      supabase,
      "chat_participants",
      "chat_id",
      chatIds
    );
    summary.chats = await del(supabase, "chats", "id", chatIds);
  }

  summary.notifications = await del(supabase, "notifications", "user_id", testIds);
  summary.admin_logs = await del(supabase, "admin_logs", "admin_id", testIds);
  summary.free_accesses_user = await del(
    supabase,
    "free_accesses",
    "user_id",
    testIds
  );
  summary.free_accesses_granted = await del(
    supabase,
    "free_accesses",
    "granted_by",
    testIds
  );
  summary.likes_from = await del(supabase, "likes", "from_user_id", testIds);
  summary.likes_to = await del(supabase, "likes", "to_user_id", testIds);
  summary.profile_passes_from = await del(
    supabase,
    "profile_passes",
    "from_user_id",
    testIds
  );
  summary.profile_passes_to = await del(
    supabase,
    "profile_passes",
    "to_user_id",
    testIds
  );
  summary.profile_photos = await del(
    supabase,
    "profile_photos",
    "profile_id",
    testIds
  );
  summary.payments = await del(supabase, "payments", "user_id", testIds);

  if (testMatchIds.length) {
    summary.matching_credit_usage = await del(
      supabase,
      "matching_credit_usage",
      "match_id",
      testMatchIds
    );
    summary.matches = await del(supabase, "matches", "id", testMatchIds);
  }

  summary.admin_profiles = await del(supabase, "admin_profiles", "id", testIds);

  await supabase
    .from("app_settings")
    .update({ updated_by: null })
    .in("updated_by", testIds);

  for (const id of testIds) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      throw new Error(`auth.deleteUser(${id}): ${error.message}`);
    }
  }
  summary.auth_users = testIds.length;

  console.log("Suppression OK :", summary);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
