-- Sellers may identify the customer attached to their own orders for receipts.
create policy "Sellers can view customers on their orders"
on public.profiles for select
using (
  exists (
    select 1 from public.orders o
    where o.customer_id = profiles.id and o.seller_id = auth.uid()
  )
);
