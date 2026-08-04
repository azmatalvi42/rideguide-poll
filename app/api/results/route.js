import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { statsFromRows } from "@/lib/stats";

export const dynamic = "force-dynamic";

/**
 * Postgres is the source of truth, so every call recounts from the rows.
 * No running tally to drift, and no free text ever leaves the server.
 */
export async function GET() {
  let supa;
  try {
    supa = serviceClient();
  } catch (e) {
    return NextResponse.json({ error: "storage not configured" }, { status: 503 });
  }

  const { data, error } = await supa
    .from("poll_responses")
    .select("response_id, submitted_at, frequency, agencies, apps, primary_app, no_app_reason, rating, frustrations, improvements, no_app_user")
    .eq("completed", true)
    .order("submitted_at", { ascending: false })
    .limit(5000);

  if (error) return NextResponse.json({ error: "could not read results" }, { status: 500 });

  const rows = (data || []).slice().reverse();
  const stats = statsFromRows(rows);
  stats.updated_at = new Date().toISOString();

  return NextResponse.json(stats, { headers: { "cache-control": "no-store" } });
}
