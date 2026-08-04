import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { cleanResponse } from "@/lib/validate";
import { hashIp, clientIp } from "@/lib/hash";

export const dynamic = "force-dynamic";

const HOURLY_CAP = 8;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const clean = cleanResponse(body);
  if (!clean) return NextResponse.json({ error: "nothing usable in that submission" }, { status: 422 });

  let supa;
  try {
    supa = serviceClient();
  } catch (e) {
    return NextResponse.json({ error: "storage not configured" }, { status: 503 });
  }

  const ip_hash = await hashIp(clientIp(req));
  const since = new Date(Date.now() - 3600 * 1000).toISOString();

  const { count } = await supa
    .from("poll_responses")
    .select("response_id", { count: "exact", head: true })
    .eq("ip_hash", ip_hash)
    .gte("submitted_at", since);

  if ((count || 0) >= HOURLY_CAP) {
    return NextResponse.json({ error: "that is a lot of responses from one place, try again later" }, { status: 429 });
  }

  const row = {
    ...clean,
    submitted_at: new Date().toISOString(),
    ip_hash,
    user_agent: (req.headers.get("user-agent") || "").slice(0, 200),
  };

  const { error } = await supa.from("poll_responses").insert(row);
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "could not save" }, { status: 500 });
  }

  const { count: total } = await supa
    .from("poll_responses")
    .select("response_id", { count: "exact", head: true })
    .eq("completed", true);

  return NextResponse.json({ ok: true, n: total || 1 });
}
