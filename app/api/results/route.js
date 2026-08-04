import { NextResponse } from "next/server";
import { readResponses } from "@/lib/store";
import { statsFromRows } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The JSON file is the source of truth, so every call recounts from the rows.
 * No running tally to drift, and no free text ever leaves the server.
 */
export async function GET() {
  let rows;
  try {
    rows = await readResponses();
  } catch (e) {
    return NextResponse.json({ error: "could not read results" }, { status: 500 });
  }

  const completed = rows
    .filter((r) => r.completed)
    .sort((a, b) => (a.submitted_at < b.submitted_at ? -1 : 1));

  const stats = statsFromRows(completed);
  stats.updated_at = new Date().toISOString();

  /* answers to the optional "one fix" question, newest first, for the quote ticker */
  stats.quotes = completed
    .map((r) => (typeof r.one_fix === "string" ? r.one_fix.replace(/\s+/g, " ").trim() : ""))
    .filter(Boolean)
    .slice(-30)
    .reverse();

  return NextResponse.json(stats, { headers: { "cache-control": "no-store" } });
}
