/**
 * Sync critical env vars from .env.local to Vercel (prod/preview/dev).
 * Run: node scripts/sync-vercel-env.mjs
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    out[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return out;
}

function addEnv(name, value, environment, sensitive = true) {
  if (!value) {
    console.error(`SKIP ${name} (${environment}): empty`);
    return false;
  }
  const args = [
    "vercel",
    "env",
    "add",
    name,
    environment,
    "--value",
    value,
    "--yes",
    "--force",
  ];
  if (sensitive) args.push("--sensitive");
  else args.push("--no-sensitive");

  const result = spawnSync("npx", args, {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  const ok = result.status === 0;
  console.log(
    `${ok ? "OK" : "FAIL"} ${name} → ${environment}${ok ? "" : `: ${(result.stderr || result.stdout || "").slice(0, 200)}`}`
  );
  return ok;
}

const local = parseEnv(resolve(root, ".env.local"));

const PROD_URL = "https://meet-and-match.vercel.app";

/** Production only — enough to go live. */
const entries = [
  {
    name: "STRIPE_SECRET_KEY",
    value: local.STRIPE_SECRET_KEY,
    sensitive: true,
  },
  {
    name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    value: local.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    sensitive: false,
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    value: local.STRIPE_WEBHOOK_SECRET,
    sensitive: true,
  },
  {
    name: "NEXT_PUBLIC_LAUNCH_FREE_UNTIL",
    value: local.NEXT_PUBLIC_LAUNCH_FREE_UNTIL || "2026-08-10",
    sensitive: false,
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    value: PROD_URL,
    sensitive: false,
  },
];

let failed = 0;
for (const entry of entries) {
  if (!addEnv(entry.name, entry.value, "production", entry.sensitive)) {
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`Finished with ${failed} failure(s)`);
  process.exit(1);
}
console.log("Production env vars synced.");
console.log(
  "Stripe key prefix:",
  (local.STRIPE_SECRET_KEY || "").slice(0, 7),
  "| webhook len:",
  (local.STRIPE_WEBHOOK_SECRET || "").length
);
