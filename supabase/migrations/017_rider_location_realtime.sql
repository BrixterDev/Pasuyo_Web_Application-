-- Ensure customer tracking receives rider GPS inserts through Supabase Realtime.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rider_locations'
  ) then
    alter publication supabase_realtime add table public.rider_locations;
  end if;
end;
$$;

-- Realtime evaluates SELECT policies for each subscriber. Keep the policy
-- explicit so customers can read only locations belonging to their orders.
drop policy if exists "Customer can view assigned rider locations" on public.rider_locations;
create policy "Customer can view assigned rider locations"
on public.rider_locations
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = rider_locations.order_id
      and o.customer_id = auth.uid()
  )
);
