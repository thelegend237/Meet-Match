#!/usr/bin/env node
/**
 * Importe le référentiel GeoNames (villes > 5 000 habitants) dans Supabase.
 *
 * Prérequis :
 *   - Migration 013 appliquée
 *   - Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 *
 * Usage :
 *   node scripts/seed-geo-cities.mjs
 *   node scripts/seed-geo-cities.mjs --dry-run
 *   node scripts/seed-geo-cities.mjs --skip-download   # zip déjà présent dans supabase/.tmp/
 */

import { createReadStream, existsSync, readFileSync } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, ".env.local");
const GEONAMES_URL =
  "https://download.geonames.org/export/dump/cities5000.zip";
const TMP_DIR = join(ROOT, "supabase", ".tmp");
const ZIP_PATH = join(TMP_DIR, "cities5000.zip");
const TXT_PATH = join(TMP_DIR, "cities5000.txt");
const BATCH_SIZE = 500;
/** Taille exacte de cities5000.zip (GeoNames, juin 2026) */
const EXPECTED_ZIP_BYTES = 5_549_551;

const dryRun = process.argv.includes("--dry-run");
const skipDownload = process.argv.includes("--skip-download");

function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    throw new Error(".env.local introuvable");
  }
  const env = {};
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function projectRefFromUrl(url) {
  const match = url?.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match?.[1] ?? null;
}

function jwtPayload(jwt) {
  try {
    const part = jwt.split(".")[1];
    if (!part) return null;
    const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function projectRefFromJwt(jwt) {
  const payload = jwtPayload(jwt);
  return typeof payload?.ref === "string" ? payload.ref : null;
}

function assertSupabaseKeysMatch(url, serviceKey) {
  const urlRef = projectRefFromUrl(url);
  if (!urlRef) return;

  if (serviceKey.startsWith("eyJ")) {
    const payload = jwtPayload(serviceKey);
    const keyRef = payload?.ref;

    if (keyRef && keyRef !== urlRef) {
      throw new Error(
        `Clés Supabase incohérentes : NEXT_PUBLIC_SUPABASE_URL → "${urlRef}" ` +
          `mais SUPABASE_SERVICE_ROLE_KEY → "${keyRef}".\n` +
          `Copiez la clé service_role du même projet dans le dashboard API.`
      );
    }

    if (payload?.role && payload.role !== "service_role") {
      throw new Error(
        `SUPABASE_SERVICE_ROLE_KEY contient une clé "${payload.role}", pas "service_role".\n` +
          "Dashboard Supabase → Settings → API → onglet Legacy API Keys → service_role (secret).\n" +
          "Ne pas réutiliser NEXT_PUBLIC_SUPABASE_ANON_KEY ici."
      );
    }
  }
}

function normalizeCityKey(city) {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function escapeSql(value) {
  return value.replace(/'/g, "''");
}

function parseLine(line) {
  const cols = line.split("\t");
  if (cols.length < 15) return null;

  const [
    geonameid,
    name,
    ,
    ,
    latitude,
    longitude,
    ,
    ,
    countryCode,
    ,
    admin1,
    ,
    ,
    ,
    population,
    ,
    ,
    timezone,
  ] = cols;

  const pop = Number.parseInt(population, 10) || 0;
  const lat = Number.parseFloat(latitude);
  const lng = Number.parseFloat(longitude);

  if (!geonameid || !name || !countryCode || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  return {
    id: Number.parseInt(geonameid, 10),
    name: name.trim(),
    name_normalized: normalizeCityKey(name),
    country_code: countryCode.trim().toUpperCase(),
    latitude: lat,
    longitude: lng,
    population: pop,
    admin1_code: admin1?.trim() || null,
    timezone: timezone?.trim() || null,
  };
}

async function fileSize(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

async function isZipComplete(path) {
  const size = await fileSize(path);
  return size === EXPECTED_ZIP_BYTES;
}

async function downloadWithCurl(url, dest) {
  const { execFileSync } = await import("node:child_process");
  await mkdir(dirname(dest), { recursive: true });

  let resumePass = 0;
  while (!(await isZipComplete(dest))) {
    resumePass += 1;
    if (resumePass > 30) {
      throw new Error(
        `Impossible d'obtenir l'archive complète (${EXPECTED_ZIP_BYTES} o) après 30 reprises`
      );
    }

    const before = await fileSize(dest);
    console.log(
      `curl ${before > 0 ? "reprise" : "téléchargement"} ` +
        `(${before}/${EXPECTED_ZIP_BYTES} o) — passe ${resumePass}…`
    );

    try {
      execFileSync(
        "curl.exe",
        [
          "-L",
          "-C",
          "-",
          "--retry",
          "5",
          "--retry-delay",
          "3",
          "--connect-timeout",
          "30",
          "-o",
          dest,
          url,
        ],
        { stdio: "inherit" }
      );
    } catch {
      /* reprise au prochain tour si fichier partiel */
    }

    const after = await fileSize(dest);
    if (after === before && after < EXPECTED_ZIP_BYTES) {
      const waitMs = Math.min(3000 * resumePass, 15_000);
      console.log(`Connexion interrompue, attente ${waitMs / 1000}s…`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  console.log(`Téléchargement terminé (${EXPECTED_ZIP_BYTES} o).`);
}

async function unzipFile(zipPath, txtPath) {
  console.log("Extraction du fichier GeoNames…");
  const { execFileSync, execSync } = await import("node:child_process");
  const extracted = join(TMP_DIR, "cities5000.txt");

  try {
    execFileSync("tar", ["-xf", zipPath, "-C", TMP_DIR], { stdio: "inherit" });
  } catch {
    try {
      execSync(
        `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${TMP_DIR.replace(/'/g, "''")}' -Force"`,
        { stdio: "inherit" }
      );
    } catch {
      execSync(`unzip -o "${zipPath}" -d "${TMP_DIR}"`, { stdio: "inherit" });
    }
  }

  if (!existsSync(extracted)) {
    throw new Error("cities5000.txt introuvable après extraction");
  }
  if (extracted !== txtPath && existsSync(txtPath)) {
    await unlink(txtPath).catch(() => {});
  }
}

async function readCities(txtPath) {
  const cities = [];
  const rl = createInterface({
    input: createReadStream(txtPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const row = parseLine(line);
    if (row) cities.push(row);
  }

  console.log(`${cities.length} villes parsées.`);
  return cities;
}

function toInsertSql(batch) {
  const values = batch
    .map(
      (c) =>
        `(${c.id}, '${escapeSql(c.name)}', '${escapeSql(c.name_normalized)}', '${c.country_code}', ${c.latitude}, ${c.longitude}, ${c.population}, ${c.admin1_code ? `'${escapeSql(c.admin1_code)}'` : "NULL"}, ${c.timezone ? `'${escapeSql(c.timezone)}'` : "NULL"})`
    )
    .join(",\n  ");

  return `INSERT INTO public.geo_cities (id, name, name_normalized, country_code, latitude, longitude, population, admin1_code, timezone)
VALUES
  ${values}
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_normalized = EXCLUDED.name_normalized,
  country_code = EXCLUDED.country_code,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  population = EXCLUDED.population,
  admin1_code = EXCLUDED.admin1_code,
  timezone = EXCLUDED.timezone;`;
}

async function upsertBatch(supabaseUrl, serviceKey, batch) {
  const sql = toInsertSql(batch);
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.status === 404) {
    return upsertViaRest(supabaseUrl, serviceKey, batch);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Batch SQL failed: ${res.status} ${text}`);
  }
}

async function upsertViaRest(supabaseUrl, serviceKey, batch) {
  const res = await fetch(`${supabaseUrl}/rest/v1/geo_cities?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(
      batch.map((c) => ({
        id: c.id,
        name: c.name,
        name_normalized: c.name_normalized,
        country_code: c.country_code,
        latitude: c.latitude,
        longitude: c.longitude,
        population: c.population,
        admin1_code: c.admin1_code,
        timezone: c.timezone,
      }))
    ),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`REST upsert failed: ${res.status} ${text}`);
  }
}

async function syncGeocodeCache(supabaseUrl, serviceKey) {
  const sql = `INSERT INTO public.geocode_cache (city_key, country_code, latitude, longitude, source)
SELECT gc.name_normalized, gc.country_code, gc.latitude, gc.longitude, 'geo_cities'
FROM public.geo_cities gc
ON CONFLICT (city_key, country_code) DO UPDATE SET
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  source = EXCLUDED.source,
  updated_at = NOW();`;

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.status === 404) {
    console.log(
      "Sync geocode_cache : exécutez manuellement le bloc SQL de fin de migration 013."
    );
    return;
  }

  if (!res.ok) {
    console.warn("Sync geocode_cache:", await res.text());
  } else {
    console.log("geocode_cache synchronisé.");
  }
}

async function main() {
  await mkdir(TMP_DIR, { recursive: true });

  const txtReady =
    existsSync(TXT_PATH) || existsSync(join(TMP_DIR, "cities5000.txt"));

  if (!txtReady) {
    const zipOk = await isZipComplete(ZIP_PATH);

    if (!zipOk) {
      if (skipDownload) {
        const size = await fileSize(ZIP_PATH);
        throw new Error(
          `Archive absente ou incomplète (${size}/${EXPECTED_ZIP_BYTES} o) : ${ZIP_PATH}\n` +
            "Téléchargez cities5000.zip via le navigateur, placez-le dans supabase/.tmp/, puis :\n" +
            "  npm run seed:geo -- --skip-download"
        );
      }
      await downloadWithCurl(GEONAMES_URL, ZIP_PATH);
    }

    await unzipFile(ZIP_PATH, TXT_PATH);
  }

  const cities = await readCities(
    existsSync(TXT_PATH) ? TXT_PATH : join(TMP_DIR, "cities5000.txt")
  );

  if (dryRun) {
    console.log("Dry-run : 5 premières villes :");
    console.log(cities.slice(0, 5));
    return;
  }

  const env = loadEnv();
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const missing = [];
  if (!supabaseUrl?.trim()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `${missing.join(" et ")} manquant(s) dans .env.local.\n` +
        "Dashboard Supabase → Project Settings → API → service_role (secret).\n" +
        "Ne commitez jamais cette clé."
    );
  }

  assertSupabaseKeysMatch(supabaseUrl, serviceKey);

  console.log(`Import de ${cities.length} villes par lots de ${BATCH_SIZE}…`);

  for (let i = 0; i < cities.length; i += BATCH_SIZE) {
    const batch = cities.slice(i, i + BATCH_SIZE);
    await upsertViaRest(supabaseUrl, serviceKey, batch);
    process.stdout.write(
      `\r${Math.min(i + BATCH_SIZE, cities.length)} / ${cities.length}`
    );
  }

  console.log("\nImport terminé.");
  await syncGeocodeCache(supabaseUrl, serviceKey);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
