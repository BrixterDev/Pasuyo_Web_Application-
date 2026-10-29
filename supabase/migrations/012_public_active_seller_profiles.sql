-- Allow the logged-out landing page to resolve the store name for active
-- seller products. Product records themselves remain limited to active rows.
create policy "Public can view sellers with active products"
on public.seller_profiles for select
using (
  exists (
    select 1
    from public.products p
    where p.seller_id = seller_profiles.seller_id
      and p.status = 'active'
  )
);
