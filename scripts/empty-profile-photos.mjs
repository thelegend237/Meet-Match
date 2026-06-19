#!/usr/bin/env node
/**
 * Vide le bucket Supabase « profile-photos ».
 *
 * Supabase interdit DELETE direct sur storage.objects (SQL) — utiliser l'API Storage.
 *
 * Prérequis : .env.local avec NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage :
 *   npm run storage:empty-photos
 *   npm run storage:empty-photos -- --dry-run
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, ".env.local");
const BUCKET = "profile-photos";
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

/** Liste récursivement tous les fichiers (pas les dossiers). */
async function collectFilePaths(supabase, prefix = "") {
  const paths = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`List ${prefix || "/"} : ${error.message}`);
    }

    if (!data?.length) break;

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      // Dossier : pas de id (ou metadata null selon versions API)
      const isFolder = item.id === null || item.id === undefined;
      if (isFolder) {
        paths.push(...(await collectFilePaths(supabase, path)));
      } else {
        paths.push(path);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return paths;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local"
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Bucket : ${BUCKET}`);
  const paths = await collectFilePaths(supabase);
  console.log(`${paths.length} fichier(s) trouvé(s).`);

  if (paths.length === 0) {
    console.log("Rien à supprimer.");
    return;
  }

  if (dryRun) {
    console.log("--dry-run : aucune suppression.");
    paths.slice(0, 10).forEach((p) => console.log(`  ${p}`));
    if (paths.length > 10) console.log(`  … et ${paths.length - 10} autres`);
    return;
  }

  const batchSize = 100;
  let removed = 0;

  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      throw new Error(`Remove batch : ${error.message}`);
    }
    removed += batch.length;
    process.stdout.write(`\rSupprimés : ${removed}/${paths.length}`);
  }

  console.log("\nBucket vidé.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
