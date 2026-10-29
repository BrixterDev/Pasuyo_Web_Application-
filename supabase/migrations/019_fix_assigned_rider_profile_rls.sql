-- Avoid RLS recursion between profiles and orders policies.
create or replace function public.customer_can_view_assigned_rider_profile(profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.orders o
    where o.customer_id = auth.uid()
      and o.rider_id = profile_id
  );
$$;

revoke all on function public.customer_can_view_assigned_rider_profile(uuid) from public;
grant execute on function public.customer_can_view_assigned_rider_profile(uuid) to authenticated;

drop policy if exists "Customers can view assigned rider profiles" on public.profiles;
create policy "Customers can view assigned rider profiles"
on public.profiles
for select
using (public.customer_can_view_assigned_rider_profile(profiles.id));
