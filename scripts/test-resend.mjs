/**
 * Test envoi email Resend — npm run test:resend [email@exemple.com]
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { Resend } from "resend";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) throw new Error(".env.local manquant");
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
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
  const apiKey = env.RESEND_API_KEY?.trim();
  const from =
    env.RESEND_FROM_EMAIL?.trim() || "Meet & Match <onboarding@resend.dev>";
  const to = process.argv[2]?.trim();

  if (!apiKey) {
    console.error("\n❌ RESEND_API_KEY absente dans .env.local");
    console.error("   1. Créez un compte sur https://resend.com");
    console.error("   2. API Keys → Create API Key");
    console.error("   3. Collez la clé re_... dans .env.local\n");
    process.exit(1);
  }

  if (!to || !to.includes("@")) {
    console.error("\nUsage: npm run test:resend -- votre@email.com\n");
    process.exit(1);
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: "Test Resend — Meet & Match",
    html: "<p>Si vous lisez ceci, Resend est correctement configuré pour Meet &amp; Match.</p>",
  });

  if (error) {
    console.error("\n❌ Erreur Resend:", error.message || error);
    process.exit(1);
  }

  console.log("\n✅ Email envoyé à", to);
  console.log("   ID:", data?.id);
  console.log("   Expéditeur:", from, "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
