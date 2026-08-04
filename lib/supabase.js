import { createClient } from "@supabase/supabase-js";

/**
 * Server only. This client uses the service role key, which bypasses RLS.
 * Never import this into a component that ships to the browser.
 */
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are missing. Check .env.local");
  return createClient(url, key, { auth: { persistSession: false } });
}
