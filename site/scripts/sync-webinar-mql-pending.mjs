/**
 * Sincroniza inscrições webinar (site_leads) que ainda não têm linha em webinar_mql_sync.
 * Uso: SUPABASE_SERVICE_KEY=... node scripts/sync-webinar-mql-pending.mjs [since=YYYY-MM-DD] [limit=N]
 */
const sbUrl = process.env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
const sbKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!sbKey) {
  console.error("Defina SUPABASE_SERVICE_KEY (service_role do projeto Marketing).");
  process.exit(1);
}

const since = process.argv[2] || "2026-09-30";
const limit = Number(process.argv[3] || 40);

const r = await fetch(`${sbUrl}/functions/v1/upsert-webinar-mql`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${sbKey}`,
    apikey: sbKey,
  },
  body: JSON.stringify({ mode: "pending_since", since, limit }),
});

const d = await r.json().catch(() => ({}));
console.log(JSON.stringify(d, null, 2));
if (!r.ok || d.ok === false) process.exit(1);
