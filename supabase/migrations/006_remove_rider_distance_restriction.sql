drop policy if exists "Customers and nearby riders view delivery orders" on public.orders;
drop policy if exists "Customers and online riders view delivery orders" on public.orders;

create policy "Customers and online riders view delivery orders" on public.orders
for select using (
  customer_id = auth.uid()
  or seller_id = auth.uid()
  or rider_id = auth.uid()
  or auth.jwt() ->> 'role' = 'admin'
  or (
    status = 'ready_for_pickup'::public.order_status
    and rider_id is null
    and exists (
      select 1
      from public.rider_profiles rp
      join public.profiles p on p.id = rp.rider_id
      where rp.rider_id = auth.uid()
        and rp.availability = 'online'::public.rider_availability
        and p.role = 'rider'::public.app_role
    )
  )
);

drop function if exists public.is_rider_near_order(uuid, uuid, double precision);

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