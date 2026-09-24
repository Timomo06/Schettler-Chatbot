-- Atomic seller-level inventory state and commit functions.
-- Apply only after 202609170001_profcar_inventory.sql.
create table if not exists public.profcar_inventory_state (
  seller_id text primary key,
  revision bigint not null default 0 check (revision >= 0),
  live_validated boolean not null default false,
  last_successful_sync timestamptz,
  last_sync_attempt timestamptz,
  last_sync_status text check (last_sync_status in ('succeeded', 'failed')),
  updated_at timestamptz not null default now()
);

alter table public.profcar_inventory_state enable row level security;
revoke all on public.profcar_inventory_state from anon, authenticated;

create or replace function public.profcar_commit_inventory(
  p_seller_id text,
  p_expected_revision bigint,
  p_completed_at timestamptz,
  p_vehicles jsonb,
  p_run jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_revision bigint;
  v_vehicle jsonb;
begin
  if p_seller_id is null or p_seller_id !~ '^[0-9]+$' then
    raise exception 'invalid seller id';
  end if;
  if jsonb_typeof(coalesce(p_vehicles, '[]'::jsonb)) <> 'array' then
    raise exception 'vehicles must be an array';
  end if;

  insert into public.profcar_inventory_state (seller_id)
  values (p_seller_id)
  on conflict (seller_id) do nothing;

  select revision into v_current_revision
  from public.profcar_inventory_state
  where seller_id = p_seller_id
  for update;

  if v_current_revision is distinct from p_expected_revision then
    raise exception using errcode = '40001', message = 'inventory revision conflict';
  end if;

  for v_vehicle in
    select value from jsonb_array_elements(coalesce(p_vehicles, '[]'::jsonb))
  loop
    if v_vehicle->>'mobileSellerId' is distinct from p_seller_id then
      raise exception 'vehicle seller mismatch';
    end if;
    insert into public.profcar_vehicles (
      id,
      mobile_ad_id,
      mobile_seller_id,
      normalized_data,
      mobile_raw_data,
      availability_status,
      last_successful_sync,
      revision
    ) values (
      v_vehicle->>'id',
      v_vehicle->>'mobileAdId',
      v_vehicle->>'mobileSellerId',
      v_vehicle->'normalizedData',
      v_vehicle->'rawData',
      'listed',
      p_completed_at,
      1
    )
    on conflict (id) do update set
      normalized_data = excluded.normalized_data,
      mobile_raw_data = excluded.mobile_raw_data,
      availability_status = 'listed',
      last_successful_sync = excluded.last_successful_sync,
      revision = public.profcar_vehicles.revision + 1
    where public.profcar_vehicles.mobile_seller_id = excluded.mobile_seller_id;
  end loop;

  update public.profcar_vehicles existing
  set
    availability_status = 'inactive',
    last_successful_sync = p_completed_at,
    revision = existing.revision + 1,
    normalized_data = jsonb_set(
      jsonb_set(existing.normalized_data, '{availabilityStatus}', '"inactive"'::jsonb, true),
      '{lastSuccessfulSync}',
      to_jsonb(p_completed_at::text),
      true
    )
  where existing.mobile_seller_id = p_seller_id
    and existing.availability_status <> 'inactive'
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_vehicles, '[]'::jsonb)) incoming
      where incoming->>'id' = existing.id
    );

  insert into public.profcar_sync_runs (
    id, seller_id, started_at, completed_at, status, vehicle_count, error_code
  ) values (
    (p_run->>'id')::uuid,
    p_seller_id,
    (p_run->>'startedAt')::timestamptz,
    (p_run->>'completedAt')::timestamptz,
    'succeeded',
    (p_run->>'vehicleCount')::integer,
    null
  );

  update public.profcar_inventory_state
  set
    revision = revision + 1,
    live_validated = true,
    last_successful_sync = p_completed_at,
    last_sync_attempt = p_completed_at,
    last_sync_status = 'succeeded',
    updated_at = now()
  where seller_id = p_seller_id;
end;
$$;

create or replace function public.profcar_record_sync_failure(p_run jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id text := p_run->>'sellerId';
  v_completed_at timestamptz := (p_run->>'completedAt')::timestamptz;
begin
  insert into public.profcar_sync_runs (
    id, seller_id, started_at, completed_at, status, vehicle_count, error_code
  ) values (
    (p_run->>'id')::uuid,
    v_seller_id,
    (p_run->>'startedAt')::timestamptz,
    v_completed_at,
    'failed',
    0,
    'SYNC_FAILED'
  );

  insert into public.profcar_inventory_state (
    seller_id, last_sync_attempt, last_sync_status, updated_at
  ) values (
    v_seller_id, v_completed_at, 'failed', now()
  )
  on conflict (seller_id) do update set
    last_sync_attempt = excluded.last_sync_attempt,
    last_sync_status = 'failed',
    updated_at = now();
end;
$$;

revoke all on function public.profcar_commit_inventory(text, bigint, timestamptz, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.profcar_record_sync_failure(jsonb) from public, anon, authenticated;
grant execute on function public.profcar_commit_inventory(text, bigint, timestamptz, jsonb, jsonb) to service_role;
grant execute on function public.profcar_record_sync_failure(jsonb) to service_role;
