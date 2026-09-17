-- Preparation only. Review and test on a local/staging database before applying.
-- Raw payloads and extras are private; publish only a normalized allowlist via server.
create table public.profcar_sync_runs (
  id uuid primary key,
  seller_id text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  status text not null check (status in ('succeeded', 'failed')),
  vehicle_count integer not null check (vehicle_count >= 0),
  error_code text check (error_code is null or error_code = 'SYNC_FAILED'),
  check (completed_at >= started_at)
);
create index profcar_sync_runs_last_success on public.profcar_sync_runs (seller_id, completed_at desc)
  where status = 'succeeded';

create table public.profcar_vehicles (
  id text primary key,
  mobile_ad_id text not null,
  mobile_seller_id text not null,
  -- All normalized model fields except extras, source payload and files.
  normalized_data jsonb not null check (jsonb_typeof(normalized_data) = 'object'),
  mobile_raw_data jsonb not null check (jsonb_typeof(mobile_raw_data) = 'object'),
  -- ProfCar-owned. Never include this column in mobile.de UPDATE clauses.
  profcar_extras jsonb not null default '{}' check (jsonb_typeof(profcar_extras) = 'object'),
  availability_status text not null default 'unknown' check (availability_status in ('listed', 'inactive', 'unknown')),
  last_successful_sync timestamptz,
  revision bigint not null default 0,
  unique (mobile_seller_id, mobile_ad_id),
  check (normalized_data->>'id' is not distinct from id),
  check (normalized_data->>'mobileAdId' is not distinct from mobile_ad_id),
  check (normalized_data->>'mobileSellerId' is not distinct from mobile_seller_id)
);
create table public.profcar_vehicle_files (
  id text primary key,
  vehicle_id text not null references public.profcar_vehicles(id) on delete restrict,
  provider text not null check (provider in ('dropbox', 'drive', 'manual')),
  external_id text,
  name text not null,
  kind text not null check (kind in ('maintenance', 'repair', 'condition', 'other')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index profcar_vehicle_files_vehicle on public.profcar_vehicle_files(vehicle_id);
alter table public.profcar_vehicles enable row level security;
alter table public.profcar_vehicle_files enable row level security;
alter table public.profcar_sync_runs enable row level security;
-- No browser policies: only a future authenticated server repository may access these.
revoke all on public.profcar_vehicles, public.profcar_vehicle_files, public.profcar_sync_runs from anon, authenticated;
