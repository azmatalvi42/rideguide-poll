# RideGuide rider poll

Eight questions, about three minutes, with a live results dashboard that unlocks on submit.
Next.js App Router, Supabase for storage, deploys free on Vercel.

```
app/
  page.jsx              the poll
  api/responses/route   POST a completed response, validated and throttled
  api/results/route     GET the aggregate counters, recounted from Postgres
components/
  RideGuidePoll.jsx     the whole survey and dashboard, one client component
lib/
  stats.js              response -> counters, shared by the API and sample mode
  validate.js           whitelists every option id, drops anything unknown
  hash.js               salted one way hash of the IP, for flood throttling
  supabase.js           service role client, server only
supabase/schema.sql     table, indexes, RLS, and analysis views
```

---

## Deploy in three steps

### 1. Supabase, about 2 minutes

Create a free project at supabase.com. Open the SQL editor, paste `supabase/schema.sql`, run it.

Then Project settings -> API, and copy two values: the **Project URL** and the **service_role** key.

### 2. Push and import

```bash
git init && git add -A && git commit -m "RideGuide poll"
gh repo create rideguide-poll --private --source=. --push
```

At vercel.com, Add New -> Project -> import the repo. Framework detection handles the rest.
Before you hit Deploy, add three environment variables:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role key |
| `IP_SALT` | any random string, `openssl rand -hex 16` is fine |

The service role key must never get a `NEXT_PUBLIC_` prefix. It bypasses row level security, and anything with that prefix is compiled into the browser bundle.

Or skip the dashboard entirely:

```bash
npm i -g vercel
vercel        # first run links the project
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel --prod
```

### 3. Your URL

Vercel gives you `<project-name>.vercel.app` free and permanently. Name the project `rideguide-poll` and you get **rideguide-poll.vercel.app**. Rename it any time under Settings -> General, the old name stays yours.

For a real domain, Settings -> Domains -> add `poll.rideguide.ca` or whatever you own, then point a CNAME at `cname.vercel-dns.com`. Custom domains and the certificate are free on the Hobby plan. The domain registration is the only thing that costs money, roughly 12 to 20 CAD a year. A `.ca` through Cloudflare or Porkbun is near cost.

Netlify and Cloudflare Pages both work the same way if you would rather not use Vercel.

---

## Local

```bash
cp .env.example .env.local   # fill in the three values
npm install
npm run dev
```

Without Supabase configured, the poll runs and saves progress, but submitting returns a 503 and the dashboard has nothing to show.

---

## Where the data lives

Every submission is a row in `poll_responses`. Row level security is on with **no policies for anon**, which means the table is unreachable from the browser. Both API routes use the service role key server side, and `/api/results` returns only counters, never a raw row and never the free text answers.

`lib/validate.js` whitelists every option id and drops anything it does not recognise instead of rejecting the response, so one stray id never costs you a participant. It also caps the text field at 600 characters and rejects submissions that are entirely empty.

Flood protection is a salted hash of the submitting IP, capped at eight responses an hour. The address itself is never stored and the hash cannot be reversed to a person.

To read the data, use the SQL editor. `supabase/schema.sql` creates `poll_app_usage`, `poll_satisfaction_by_app`, `poll_frustrations`, `poll_feature_score` and `poll_daily_volume`. For raw export, Table editor -> poll_responses -> Export CSV.

---

## Live updates

The dashboard polls `/api/results` every 10 seconds while the tab is visible, pauses when it is hidden, and catches up on return. Each call recounts from Postgres, so there is no cached tally that can drift. Recount is the same request, forced.

At a few thousand responses this stays comfortable. Past that, move the counting into SQL with the views in `schema.sql`, or subscribe to inserts with Supabase Realtime instead of polling.

## Before you share the link

- The poll is anonymous, but the free text box is not policed. Skim `one_fix` before quoting anyone.
- `HOURLY_CAP` in `app/api/responses/route.js` is 8. Lower it for a public link, raise it if you are testing.
- Results unlock on submit and the flag is per browser. Clearing site data locks it again.
