/**
 * Whitelists for every field the poll can send. Anything not on a list is
 * dropped rather than rejected, so one stray option id never costs a response.
 */
export const OPTIONS = {
  frequency: ["daily", "weekly", "monthly", "occasional", "rarely"],
  agencies: ["ttc", "go", "miway", "brampton", "yrt", "other_gta", "outside_gta"],
  apps: ["google_maps", "apple_maps", "transit_app", "citymapper", "moovit", "agency_app", "rideshare", "other_app", "no_app"],
  no_app_reason: ["know_routes", "signs_schedules", "agency_website", "ask_or_wait", "not_accurate", "confusing", "ads_or_cost", "phone_limits", "no_smartphone", "other_no_app"],
  frustrations: ["wrong_arrivals", "late_delays", "hidden_cancellations", "bad_live", "confusing_routes", "bad_transfers", "no_explanation", "no_fares", "weak_accessibility", "no_crowding", "multi_agency_gaps", "ads", "paywall", "clutter", "notifications", "battery", "other_frustration"],
  improvements: ["accurate_arrivals", "early_warnings", "better_alternates", "cleaner_ui", "fewer_ads", "fare_clarity", "accessibility", "live_tracking", "transfers", "personal_alerts", "crowding_info", "safety_info", "multi_agency_support", "multimodal", "ai_assistant"],
};

const pickOne = (v, list) => (typeof v === "string" && list.includes(v) ? v : null);
const pickMany = (v, list, cap) =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string" && list.includes(x)).slice(0, cap) : [];

export function cleanResponse(body) {
  if (!body || typeof body !== "object") return null;

  const apps = pickMany(body.apps, OPTIONS.apps, 9);
  const usesApps = apps.filter((a) => a !== "no_app");

  const clean = {
    response_id: typeof body.response_id === "string" ? body.response_id.slice(0, 64) : null,
    version: typeof body.version === "string" ? body.version.slice(0, 24) : "poll_v2",
    frequency: pickOne(body.frequency, OPTIONS.frequency),
    agencies: pickMany(body.agencies, OPTIONS.agencies, 7),
    apps,
    primary_app: usesApps.includes(body.primary_app) ? body.primary_app : usesApps.length === 1 ? usesApps[0] : null,
    no_app_reason: usesApps.length === 0 ? pickOne(body.no_app_reason, OPTIONS.no_app_reason) : null,
    rating: Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 10 ? body.rating : null,
    frustrations: pickMany(body.frustrations, OPTIONS.frustrations, 5),
    improvements: pickMany(body.improvements, OPTIONS.improvements, 5),
    one_fix: typeof body.one_fix === "string" ? body.one_fix.trim().slice(0, 600) || null : null,
    no_app_user: usesApps.length === 0,
    completed: true,
  };

  if (!clean.response_id) return null;
  // a response with nothing in it is a bot or a broken client
  if (!clean.frequency && clean.apps.length === 0 && clean.frustrations.length === 0) return null;
  return clean;
}
