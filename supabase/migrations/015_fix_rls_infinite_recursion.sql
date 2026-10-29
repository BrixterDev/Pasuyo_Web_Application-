-- Fix infinite recursion between public.profiles and public.orders RLS policies.
-- By using SECURITY DEFINER helper functions, row lookups inside the policies
-- do not trigger re-evaluation of RLS on other tables.

create or replace function public.is_online_rider(p_rider_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.rider_profiles rp
    join public.profiles p on p.id = rp.rider_id
    where rp.rider_id = p_rider_id
      and rp.availability = 'online'::public.rider_availability
      and p.role = 'rider'::public.app_role
  );
$$;

create or replace function public.is_seller_of_customer(p_seller_id uuid, p_customer_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.orders o
    where o.customer_id = p_customer_id
      and o.seller_id = p_seller_id
  );
$$;

revoke all on function public.is_online_rider(uuid) from public;
grant execute on function public.is_online_rider(uuid) to authenticated;

revoke all on function public.is_seller_of_customer(uuid, uuid) from public;
grant execute on function public.is_seller_of_customer(uuid, uuid) to authenticated;

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
    and public.is_online_rider(auth.uid())
  )
);

drop policy if exists "Sellers can view customers on their orders" on public.profiles;

create policy "Sellers can view customers on their orders"
on public.profiles for select
using (
  public.is_seller_of_customer(auth.uid(), profiles.id)
);
