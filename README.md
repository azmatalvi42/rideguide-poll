# RideGuide rider poll

Eight questions, about three minutes, with a live results dashboard that unlocks on submit.
Next.js App Router, responses stored as JSON in the repo, no database and no accounts.

```
app/
  page.jsx              the poll
  api/responses/route   POST a completed response, validated and throttled
  api/results/route     GET the aggregate counters, recounted from the file
components/
  RideGuidePoll.jsx     the whole survey and dashboard, one client component
lib/
  stats.js              response -> counters, shared by the API and sample mode
  validate.js           whitelists every option id, drops anything unknown
  hash.js               salted one way hash of the IP, for flood throttling
  store.js              serialized atomic reads and writes to the JSON file
data/responses.json     every submitted response, the source of truth
```

---

## Local

```bash
npm install
npm run dev
```

That is the whole setup. No environment variables are required locally; set `IP_SALT` to any random string in production so the flood-throttle hash is not guessable.

## Deploy

Storage is a file on disk, so the app needs a host with a persistent filesystem — a VPS, Railway, Fly.io, Render with a disk, or any box running `npm run build && npm start`. Serverless platforms (Vercel, Netlify, Cloudflare Pages) will not work: their filesystems are ephemeral, so submissions would vanish on the next cold start.

---

## Where the data lives

Every submission is appended to `data/responses.json` by `lib/store.js`. Writes are serialized through a queue and written temp-file-then-rename, so a crash mid-write cannot truncate the file. `/api/results` returns only counters, never a raw row and never the free text answers.

`lib/validate.js` whitelists every option id and drops anything it does not recognise instead of rejecting the response, so one stray id never costs you a participant. It also caps the text field at 600 characters and rejects submissions that are entirely empty.

Flood protection is a salted hash of the submitting IP, capped at eight responses an hour. The address itself is never stored and the hash cannot be reversed to a person.

To read the data, open `data/responses.json`. It is plain JSON, one object per response.

---

## Live updates

The dashboard polls `/api/results` every 10 seconds while the tab is visible, pauses when it is hidden, and catches up on return. Each call recounts from the file, so there is no cached tally that can drift. Recount is the same request, forced.

At a few thousand responses this stays comfortable. Past that, cache the parsed rows in memory and invalidate on write.

## Before you share the link

- The poll is anonymous, but the free text box is not policed. Skim `one_fix` before quoting anyone.
- `HOURLY_CAP` in `app/api/responses/route.js` is 8. Lower it for a public link, raise it if you are testing.
- Results unlock on submit and the flag is per browser. Clearing site data locks it again.
