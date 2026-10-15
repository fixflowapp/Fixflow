-- FixFlow replica — Supabase schema
-- Run this in Supabase → SQL Editor → New query → Run.
--
-- Design: a single `ff_records` table keyed by (collection, id). The app's object
-- shape is stored verbatim in `data` jsonb, so there is no column drift and new
-- fields can be added without migrations. Query a field with data->>'field'.
--
-- SECURITY: the anon key ships in the browser, so it is treated as public. The
-- policies below grant the anon role NOTHING. Every read/write requires a
-- signed-in user (Supabase Auth). service_role bypasses RLS for tooling/seeding.
-- For a multi-tenant deployment, tighten the policies from "authenticated" to
-- an owner check, e.g. using (owner_id = auth.uid()).

-- ---------------------------------------------------------------------------
-- Tables (create-if-not-exists so this script is idempotent)
-- ---------------------------------------------------------------------------
create table if not exists public.ff_records (
  collection  text        not null,
  id          text        not null,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (collection, id)
);

create index if not exists ff_records_collection_idx on public.ff_records (collection);
create index if not exists ff_records_data_gin_idx   on public.ff_records using gin (data jsonb_path_ops);

-- Keep updated_at fresh on every write
create or replace function public.ff_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ff_records_touch on public.ff_records;
create trigger ff_records_touch
  before insert or update on public.ff_records
  for each row execute function public.ff_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Settings singleton (business configuration, not a list)
-- ---------------------------------------------------------------------------
create table if not exists public.ff_settings (
  id    text primary key default 'default',
  data  jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.ff_settings (id, data)
values ('default', '{}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security — authenticated only. The anon key is public, so it gets
-- no table privileges at all; a signed-in session is required to touch data.
-- ---------------------------------------------------------------------------
alter table public.ff_records  enable row level security;
alter table public.ff_settings enable row level security;

-- Drop the wide-open policies shipped in the first release.
drop policy if exists ff_records_demo_all    on public.ff_records;
drop policy if exists ff_settings_demo_all   on public.ff_settings;
drop policy if exists ff_records_authed_all  on public.ff_records;
drop policy if exists ff_settings_authed_all on public.ff_settings;

-- Strip every privilege the anon role may still hold (tables + views).
revoke all on public.ff_records  from anon;
revoke all on public.ff_settings from anon;

grant select, insert, update, delete on public.ff_records  to authenticated, service_role;
grant select, insert, update, delete on public.ff_settings to authenticated, service_role;

create policy ff_records_authed_all on public.ff_records
  for all to authenticated using (true) with check (true);

create policy ff_settings_authed_all on public.ff_settings
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Convenience views (optional, read-only) so the jsonb data is easy to browse.
-- security_invoker makes the caller's own RLS apply — anon cannot read through
-- a view that its base table would deny.
-- ---------------------------------------------------------------------------
create or replace view public.v_jobs with (security_invoker = true) as
  select r.id,
         r.data->>'customerId'  as customer_id,
         r.data->>'title'       as title,
         r.data->>'deviceType'  as device_type,
         r.data->>'status'      as status,
         r.data->>'priority'    as priority,
         (r.data->>'estimatedCost')::numeric as estimated_cost,
         r.data->>'createdAt'   as created_at
  from public.ff_records r where r.collection = 'jobs';

create or replace view public.v_customers with (security_invoker = true) as
  select r.id,
         r.data->>'company' as company,
         r.data->>'name'    as contact,
         r.data->>'email'   as email,
         r.data->>'phone'   as phone,
         r.data->>'city'    as city
  from public.ff_records r where r.collection = 'customers';

create or replace view public.v_invoices with (security_invoker = true) as
  select r.id,
         r.data->>'number'     as number,
         r.data->>'customerId' as customer_id,
         r.data->>'status'     as status,
         (r.data->>'total')::numeric    as total,
         r.data->>'issuedAt'   as issued_at,
         r.data->>'dueAt'      as due_at
  from public.ff_records r where r.collection = 'invoices';

revoke all on public.v_jobs      from anon;
revoke all on public.v_customers from anon;
revoke all on public.v_invoices  from anon;
grant select on public.v_jobs, public.v_customers, public.v_invoices to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Collections the app syncs
-- ---------------------------------------------------------------------------
-- technicians, customers, jobs, invoices, payments, suppliers, parts,
-- contracts, workOrders, templates, recurringJobs, assets, conversations,
-- auditLogs, gdprRequests, notifications, serviceRequests
