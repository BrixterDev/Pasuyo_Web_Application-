-- Customers need to read image metadata so marketplace queries can resolve
-- the public Storage URLs saved in product_images.
create policy "Customers can view active product images"
on public.product_images for select
using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.status = 'active'
  )
);
