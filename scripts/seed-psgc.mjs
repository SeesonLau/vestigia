// scripts/seed-psgc.mjs
// One-shot bulk seeder: re-fetches PSGC and upserts cities/barangays
// via supabase-js + anon key. Used because the SQL migration files for
// these tables are too large to round-trip through tooling.
//
// Pre-requisite: RLS must be DISABLED on ph_cities and ph_barangays
// for the anon key to insert; re-enable after.
//
// Usage:  node scripts/seed-psgc.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !KEY) throw new Error("Missing Supabase env in .env.local");

const supabase = createClient(URL, KEY);
const API = "https://psgc.gitlab.io/api";
const MANILA_CITY_CODE = "133900000";
const CHUNK = 1000;

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

async function upsertChunked(table, rows) {
  console.log(`  upserting ${rows.length} rows into ${table}...`);
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from(table)
      .upsert(slice, { onConflict: "code", ignoreDuplicates: true });
    if (error) throw new Error(`${table} chunk @${i}: ${error.message}`);
    process.stdout.write(`    ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
  }
  console.log("");
}

(async () => {
  console.log("Fetching cities...");
  const cities = await fetchJson(`${API}/cities-municipalities/`);
  const cityCodes = new Set(cities.map((c) => c.code));
  const cRows = cities.map((c) => ({
    code: c.code,
    province_code: c.provinceCode || null,
    name: c.name,
  }));

  console.log("Fetching barangays...");
  const barangays = await fetchJson(`${API}/barangays/`);
  let skipped = 0;
  const bRows = [];
  for (const b of barangays) {
    let parent = b.cityCode || b.municipalityCode || b.subMunicipalityCode || null;
    if (!parent || !cityCodes.has(parent)) {
      if (typeof parent === "string" && parent.startsWith("1339")) {
        parent = MANILA_CITY_CODE;
      } else {
        skipped++;
        continue;
      }
    }
    bRows.push({ code: b.code, city_code: parent, name: b.name });
  }
  console.log(`  ${bRows.length} barangays; ${skipped} skipped`);

  await upsertChunked("ph_cities", cRows);
  await upsertChunked("ph_barangays", bRows);

  console.log("\nDone. Don't forget to re-enable RLS:");
  console.log("  ALTER TABLE ph_cities    ENABLE ROW LEVEL SECURITY;");
  console.log("  ALTER TABLE ph_barangays ENABLE ROW LEVEL SECURITY;");
})();
