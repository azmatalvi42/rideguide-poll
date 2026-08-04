/**
 * One place where a response turns into counters.
 * Imported by the API route that aggregates the results.
 */

export const emptyStats = () => ({
  version: "stats_v1",
  n: 0,
  updated_at: null,
  rating_sum: 0,
  rating_n: 0,
  rating_low: 0,
  no_app_users: 0,
  frequency: {},
  agencies: {},
  apps: {},
  primary: {},
  frustrations: {},
  features: {},
  no_app_reason: {},
  recent: [],
});

const inc = (m, k, by = 1) => {
  if (!k) return;
  m[k] = (m[k] || 0) + by;
};

export function applyToStats(stats, r) {
  const s = stats;
  s.n += 1;
  inc(s.frequency, r.frequency);
  (r.agencies || []).forEach((a) => inc(s.agencies, a));
  (r.apps || []).forEach((a) => inc(s.apps, a));
  (r.frustrations || []).forEach((f) => inc(s.frustrations, f));
  (r.improvements || []).slice(0, 5).forEach((f, i) => inc(s.features, f, 5 - i));
  if (r.no_app_user) {
    s.no_app_users += 1;
    inc(s.no_app_reason, r.no_app_reason);
  }
  if (typeof r.rating === "number") {
    s.rating_sum += r.rating;
    s.rating_n += 1;
    if (r.rating <= 6) s.rating_low += 1;
    if (r.primary_app) {
      const p = s.primary[r.primary_app] || { sum: 0, n: 0 };
      p.sum += r.rating;
      p.n += 1;
      s.primary[r.primary_app] = p;
    }
  }
  s.recent = [
    {
      at: r.submitted_at || new Date().toISOString(),
      primary_app: r.primary_app || null,
      rating: typeof r.rating === "number" ? r.rating : null,
      top: (r.improvements || [])[0] || null,
      agency: (r.agencies || [])[0] || null,
    },
    ...s.recent,
  ].slice(0, 12);
  s.updated_at = new Date().toISOString();
  return s;
}

export const statsFromRows = (rows) => rows.reduce((acc, r) => applyToStats(acc, r), emptyStats());
