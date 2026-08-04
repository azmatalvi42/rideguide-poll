import { NextResponse } from "next/server";
import { readResponses, appendResponse } from "@/lib/store";
import { cleanResponse } from "@/lib/validate";
import { hashIp, clientIp } from "@/lib/hash";

export const runtime = "nodejs";
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

  const ip_hash = await hashIp(clientIp(req));
  const since = new Date(Date.now() - 3600 * 1000).toISOString();

  try {
    const existing = await readResponses();
    const recentFromHere = existing.filter((r) => r.ip_hash === ip_hash && r.submitted_at >= since).length;
    if (recentFromHere >= HOURLY_CAP) {
      return NextResponse.json({ error: "that is a lot of responses from one place, try again later" }, { status: 429 });
    }

    const row = {
      ...clean,
      submitted_at: new Date().toISOString(),
      ip_hash,
      user_agent: (req.headers.get("user-agent") || "").slice(0, 200),
    };

    const { rows } = await appendResponse(row);
    const total = rows.filter((r) => r.completed).length;
    return NextResponse.json({ ok: true, n: total || 1 });
  } catch (e) {
    return NextResponse.json({ error: "could not save" }, { status: 500 });
  }
}
