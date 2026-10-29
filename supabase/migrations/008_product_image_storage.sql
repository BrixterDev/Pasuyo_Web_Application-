-- Create a dedicated bucket for seller product images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Public users can view product images.
create policy "Product images are publicly viewable"
on storage.objects for select
using (bucket_id = 'product-images');

-- Sellers can upload images only for products they own.
create policy "Sellers upload product images"
on storage.objects for insert
with check (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
  and exists (
    select 1
    from public.products p
    where p.seller_id = auth.uid()
      and p.id = (split_part(name, '/', 2))::uuid
  )
);

-- Sellers can replace their own product images.
create policy "Sellers update their product images"
on storage.objects for update using (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
  and exists (
    select 1
    from public.products p
    where p.seller_id = auth.uid()
      and p.id::text = split_part(name, '/', 2)
  )
) with check (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
  and exists (
    select 1
    from public.products p
    where p.seller_id = auth.uid()
      and p.id = (split_part(name, '/', 2))::uuid
  )
);

-- Sellers can remove their own product images.
create policy "Sellers delete their product images"
on storage.objects for delete using (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
  and exists (
    select 1
    from public.products p
    where p.seller_id = auth.uid()
      and p.id = (split_part(name, '/', 2))::uuid
  )
);
