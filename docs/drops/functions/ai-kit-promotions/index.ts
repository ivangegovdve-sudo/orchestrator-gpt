import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function rest(path: string, init: RequestInit = {}) {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("read_path_not_configured");
  const result = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  if (!result.ok) throw new Error("read_path_database_error");
  return result.json();
}

const publicFields = [
  "id", "kind", "offer_decision", "status", "review_status", "title", "summary", "provider",
  "url", "expires_at", "last_verified_at", "recheck_cadence_days",
  "withdrawn_at", "withdrawal_reason",
].join(",");

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "GET") return response({ error: "method_not_allowed" }, 405);

  try {
    const now = new Date().toISOString();
    await rest("rpc/withdraw_expired_ai_kit_promotions", {
      method: "POST",
      body: JSON.stringify({ as_of: now }),
    });

    const rows = await rest(`ai_kit_promotions?select=${publicFields}&order=kind.asc,expires_at.asc,last_verified_at.asc`);
    const safeRows = (Array.isArray(rows) ? rows : []).filter((row) => row && row.review_status !== "rejected");
    return response({
      generated_at: now,
      source: "The Drop evaluated corpus plus a reviewed promotion layer",
      boundary: "No mail ingestion, corpus copy, or upstream relevance rerun occurs here.",
      active: safeRows.filter((row) => row.status === "active" && row.review_status === "approved" && row.offer_decision === "free_offer"),
      standing_tiers: safeRows.filter((row) => row.kind === "standing_tier" && row.status === "active" && row.review_status === "approved" && row.offer_decision === "free_offer"),
      unverified: safeRows.filter((row) => row.status === "unverified"),
      archive: safeRows.filter((row) => row.status === "expired" || row.withdrawn_at),
    });
  } catch (_error) {
    // Do not expose configuration, service-role details, or database errors in
    // a public response. The page renders no active offers on this path.
    return response({ error: "promotion_read_path_unavailable" }, 503);
  }
});
