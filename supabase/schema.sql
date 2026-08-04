-- RideGuide poll storage
-- Run this in the Supabase SQL editor, or as a migration.

create table if not exists public.poll_responses (
  response_id    text primary key,
  submitted_at   timestamptz not null default now(),
  version        text not null default 'poll_v2',

  frequency      text,
  agencies       text[]  not null default '{}',
  apps           text[]  not null default '{}',
  primary_app    text,
  no_app_reason  text,
  rating         smallint check (rating between 1 and 10),
  frustrations   text[]  not null default '{}',
  improvements   text[]  not null default '{}',
  one_fix        text,

  no_app_user    boolean not null default false,
  completed      boolean not null default true,

  -- salted hash of the submitting IP. never the address itself.
  -- used only to throttle floods, and it cannot be reversed to a person.
  ip_hash        text,
  user_agent     text
);

create index if not exists poll_responses_submitted_idx    on public.poll_responses (submitted_at desc);
create index if not exists poll_responses_apps_idx         on public.poll_responses using gin (apps);
create index if not exists poll_responses_frustrations_idx on public.poll_responses using gin (frustrations);
create index if not exists poll_responses_agencies_idx     on public.poll_responses using gin (agencies);
create index if not exists poll_responses_iphash_idx       on public.poll_responses (ip_hash, submitted_at desc);

-- Row level security on, and deliberately no policies for anon or authenticated.
-- Every read and write goes through the API routes using the service role key,
-- which bypasses RLS. Nothing is reachable from the browser with the anon key.
alter table public.poll_responses enable row level security;

-- ---------------------------------------------------------------
-- Convenience views for poking at the data in the SQL editor.
-- The dashboard aggregates client side so it can filter, so it does
-- not depend on these.
-- ---------------------------------------------------------------

create or replace view public.poll_app_usage as
select unnest(apps) as app_id, count(*) as riders
from public.poll_responses
where completed
group by 1
order by 2 desc;

create or replace view public.poll_satisfaction_by_app as
select primary_app,
       round(avg(rating)::numeric, 1) as mean_rating,
       count(*)                       as riders
from public.poll_responses
where completed and rating is not null and primary_app is not null
group by 1
order by 2 desc;

create or replace view public.poll_frustrations as
select unnest(frustrations) as frustration_id, count(*) as riders
from public.poll_responses
where completed
group by 1
order by 2 desc;

-- rank 1 is worth 5 points, rank 5 is worth 1. matches the dashboard.
create or replace view public.poll_feature_score as
select t.id as feature_id,
       sum(6 - t.ord) as weighted_score,
       count(*)       as times_picked
from public.poll_responses r,
     unnest(r.improvements) with ordinality as t(id, ord)
where r.completed and t.ord <= 5
group by 1
order by 2 desc;

create or replace view public.poll_daily_volume as
select date_trunc('day', submitted_at)::date as day, count(*) as responses
from public.poll_responses
group by 1
order by 1;
