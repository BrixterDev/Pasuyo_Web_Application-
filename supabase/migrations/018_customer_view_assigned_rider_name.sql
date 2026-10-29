-- Allow a customer to read the name of the rider assigned to their order.
-- This is intentionally scoped to assigned orders; profiles remain private otherwise.
drop policy if exists "Customers can view assigned rider profiles" on public.profiles;
create policy "Customers can view assigned rider profiles"
on public.profiles
for select
using (
  exists (
    select 1
    from public.orders o
    where o.customer_id = auth.uid()
      and o.rider_id = profiles.id
  )
);
