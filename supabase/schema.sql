-- TankIT – shared community prices (Supabase / PostgreSQL)
-- Run once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: it drops and recreates only TankIT's own objects.
--
-- Design
--  * Visitors never touch the tables directly (RLS on, no policies).
--  * Reads go through the view latest_prices (no device ids exposed).
--  * Writes go through two functions, which enforce spam protection:
--      report_price  – rate limits per device, price range, plausibility
--      confirm_price – one confirmation per device and report, not your own
--  * client_id is a random id stored in the browser (no login, no personal data).

drop view     if exists latest_prices;
drop function if exists report_price(text, text, numeric, text, uuid);
drop function if exists confirm_price(uuid, uuid);
drop table    if exists price_confirmations;
drop table    if exists price_reports;

create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────────

create table price_reports (
  id             uuid          primary key default gen_random_uuid(),
  station_id     text          not null check (station_id ~ '^osm_[nwr][0-9]+$'),
  fuel_type      text          not null check (fuel_type in ('e5', 'e10', 'diesel')),
  price          numeric(4,3)  not null check (price between 0.80 and 3.50),
  reporter_name  text          not null default 'Anonymous' check (char_length(reporter_name) between 1 and 30),
  client_id      uuid          not null,
  reported_at    timestamptz   not null default now()
);

create index price_reports_station_idx on price_reports (station_id, fuel_type, reported_at desc);
create index price_reports_client_idx  on price_reports (client_id, reported_at desc);
create index price_reports_fuel_idx    on price_reports (fuel_type, reported_at desc);

create table price_confirmations (
  report_id     uuid         not null references price_reports (id) on delete cascade,
  client_id     uuid         not null,
  confirmed_at  timestamptz  not null default now(),
  primary key (report_id, client_id)
);

alter table price_reports       enable row level security;
alter table price_confirmations enable row level security;
-- No policies on purpose: anon/authenticated cannot read or write the tables.

-- ── Public read view ────────────────────────────────────────────────────────
-- Newest report per station + fuel from the last 7 days, with confirmations.
-- Runs with the owner's rights (bypasses RLS) but exposes no client ids.

create view latest_prices as
select distinct on (r.station_id, r.fuel_type)
  r.id,
  r.station_id,
  r.fuel_type,
  r.price,
  r.reporter_name,
  r.reported_at,
  (select count(*) from price_confirmations c where c.report_id = r.id)::int as confirmations
from price_reports r
where r.reported_at > now() - interval '7 days'
order by r.station_id, r.fuel_type, r.reported_at desc;

grant select on latest_prices to anon, authenticated;

-- ── Write functions ─────────────────────────────────────────────────────────

create function report_price(
  p_station_id    text,
  p_fuel_type     text,
  p_price         numeric,
  p_reporter_name text,
  p_client_id     uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     uuid;
  v_recent int;
  v_median numeric;
  v_count  int;
begin
  -- Same device, same station + fuel: once per 10 minutes
  if exists (
    select 1 from price_reports
    where client_id = p_client_id and station_id = p_station_id and fuel_type = p_fuel_type
      and reported_at > now() - interval '10 minutes'
  ) then
    raise exception 'RATE_LIMIT';
  end if;

  -- Same device: at most 30 reports per hour
  select count(*) into v_recent
  from price_reports
  where client_id = p_client_id and reported_at > now() - interval '1 hour';
  if v_recent >= 30 then
    raise exception 'RATE_LIMIT';
  end if;

  -- Plausibility: within ±25 % of today's national median for this fuel
  -- (only once there are enough reports to compare against)
  select percentile_cont(0.5) within group (order by price), count(*)
    into v_median, v_count
  from price_reports
  where fuel_type = p_fuel_type and reported_at > now() - interval '24 hours';
  if v_count >= 10 and abs(p_price - v_median) > v_median * 0.25 then
    raise exception 'IMPLAUSIBLE';
  end if;

  insert into price_reports (station_id, fuel_type, price, reporter_name, client_id)
  values (
    p_station_id,
    p_fuel_type,
    round(p_price, 3),
    coalesce(nullif(left(trim(p_reporter_name), 30), ''), 'Anonymous'),
    p_client_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

create function confirm_price(p_report_id uuid, p_client_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- You can't confirm your own report
  if exists (select 1 from price_reports where id = p_report_id and client_id = p_client_id) then
    raise exception 'OWN_REPORT';
  end if;

  insert into price_confirmations (report_id, client_id)
  values (p_report_id, p_client_id)
  on conflict do nothing;

  select count(*) into v_count from price_confirmations where report_id = p_report_id;
  return v_count;
end;
$$;

revoke all on function report_price(text, text, numeric, text, uuid) from public;
revoke all on function confirm_price(uuid, uuid) from public;
grant execute on function report_price(text, text, numeric, text, uuid) to anon, authenticated;
grant execute on function confirm_price(uuid, uuid) to anon, authenticated;
