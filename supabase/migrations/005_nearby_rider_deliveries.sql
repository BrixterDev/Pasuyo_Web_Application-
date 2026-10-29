alter table public.rider_profiles
  add column if not exists location_updated_at timestamptz;

create or replace function public.is_rider_near_order(
  p_order_id uuid,
  p_rider_id uuid,
  p_radius_km double precision default 15
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    join public.rider_profiles rp on rp.rider_id = p_rider_id
    left join public.seller_profiles sp on sp.seller_id = o.seller_id
    cross join lateral (
      select sp.latitude, sp.longitude
    ) pickup_location
    where o.id = p_order_id
      and o.status = 'ready_for_pickup'::public.order_status
      and o.rider_id is null
      and rp.availability = 'online'::public.rider_availability
      and rp.location_updated_at between now() - interval '5 minutes' and now() + interval '30 seconds'
      and p_rider_id = auth.uid()
      and rp.latitude between -90 and 90
      and rp.longitude between -180 and 180
      and pickup_location.latitude is not null
      and pickup_location.longitude is not null
      and 6371 * 2 * asin(least(1::double precision, sqrt(greatest(0::double precision,
        power(sin(radians(pickup_location.latitude - rp.latitude) / 2), 2)
        + cos(radians(rp.latitude)) * cos(radians(pickup_location.latitude))
        * power(sin(radians(pickup_location.longitude - rp.longitude) / 2), 2)
      )))) <= p_radius_km
  );
$$;

revoke all on function public.is_rider_near_order(uuid, uuid, double precision) from public;
grant execute on function public.is_rider_near_order(uuid, uuid, double precision) to anon, authenticated;

drop policy if exists "Customers own order access" on public.orders;
drop policy if exists "Customers and online riders view delivery orders" on public.orders;
drop policy if exists "Customers and nearby riders view delivery orders" on public.orders;
create policy "Customers and nearby riders view delivery orders" on public.orders
for select using (
  customer_id = auth.uid()
  or seller_id = auth.uid()
  or rider_id = auth.uid()
  or auth.jwt() ->> 'role' = 'admin'
  or public.is_rider_near_order(id, auth.uid(), 15)
);

create or replace function public.claim_delivery(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rider_id uuid := auth.uid();
  v_order_id uuid;
begin
  if v_rider_id is null or not exists (
    select 1 from public.profiles
    where id = v_rider_id and role = 'rider'::public.app_role
  ) then
    raise exception 'Rider authentication required.';
  end if;

  perform 1
  from public.rider_profiles
  where rider_id = v_rider_id and availability = 'online'::public.rider_availability
  for update;

  if not found then
    raise exception 'Set your availability to online before accepting a delivery.';
  end if;

  if not public.is_rider_near_order(p_order_id, v_rider_id, 15) then
    raise exception 'This delivery is outside your 15 km pickup area or your location is stale.';
  end if;

  update public.orders
  set rider_id = v_rider_id,
      status = 'rider_assigned'::public.order_status,
      updated_at = now()
  where id = p_order_id
    and status = 'ready_for_pickup'::public.order_status
    and rider_id is null
  returning id into v_order_id;

  if v_order_id is null then
    raise exception 'This delivery is no longer available.';
  end if;

  return v_order_id;
end;
$$;

revoke all on function public.claim_delivery(uuid) from public;
grant execute on function public.claim_delivery(uuid) to authenticated;