/**
 * One-time (or repeat) upload of footer PNGs to Supabase Storage.
 *
 * Prerequisites:
 * - Bucket `site-assets` exists and is public (see supabase_storage_site_assets.sql).
 * - joey-admin/.env.local contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Run from repo root or joey-admin:
 *   cd joey-admin && node scripts/upload-newsletter-social-icons.cjs
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const FILES = ["instagram.png", "facebook.png", "twitter.png", "joey-website.png"];

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY in environment or .env.local",
    );
    process.exit(1);
  }

  const publicDir = path.join(__dirname, "..", "public", "newsletter-social");
  for (const name of FILES) {
    const fp = path.join(publicDir, name);
    if (!fs.existsSync(fp)) {
      console.error("Missing file:", fp);
      process.exit(1);
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const name of FILES) {
    const fp = path.join(publicDir, name);
    const buf = fs.readFileSync(fp);
    const storagePath = `newsletter-social/${name}`;
    const { error } = await supabase.storage.from("site-assets").upload(storagePath, buf, {
      contentType: "image/png",
      upsert: true,
    });
    if (error) {
      console.error("Upload failed:", storagePath, error.message);
      process.exit(1);
    }
    console.log("Uploaded", storagePath);
  }

  const { data } = supabase.storage.from("site-assets").getPublicUrl("newsletter-social/instagram.png");
  const iconsBase = data.publicUrl.replace(/\/instagram\.png$/, "");

  console.log("\n--- Add these to joey-admin/.env.local (same value for both) ---\n");
  console.log(`NEXT_PUBLIC_NEWSLETTER_SOCIAL_ICONS_BASE=${iconsBase}`);
  console.log(`NEWSLETTER_SOCIAL_ICONS_BASE=${iconsBase}`);
  console.log("\nRestart npm run dev. New newsletters will use these URLs for footer icons.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
