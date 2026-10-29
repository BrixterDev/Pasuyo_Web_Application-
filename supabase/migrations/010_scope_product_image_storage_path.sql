-- In the product lookup subquery, unqualified `name` resolves to products.name.
-- Qualifying storage.objects.name makes the policy inspect the uploaded path.
drop policy if exists "Sellers upload product images" on storage.objects;
drop policy if exists "Sellers update their product images" on storage.objects;
drop policy if exists "Sellers delete their product images" on storage.objects;

create policy "Sellers upload product images"
on storage.objects for insert
with check (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
  and split_part(storage.objects.name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.products p
    where p.seller_id = auth.uid()
      and p.id::text = split_part(storage.objects.name, '/', 2)
  )
);

create policy "Sellers update their product images"
on storage.objects for update using (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
  and split_part(storage.objects.name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.products p
    where p.seller_id = auth.uid()
      and p.id::text = split_part(storage.objects.name, '/', 2)
  )
) with check (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
  and split_part(storage.objects.name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.products p
    where p.seller_id = auth.uid()
      and p.id::text = split_part(storage.objects.name, '/', 2)
  )
);

create policy "Sellers delete their product images"
on storage.objects for delete using (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
  and split_part(storage.objects.name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.products p
    where p.seller_id = auth.uid()
      and p.id::text = split_part(storage.objects.name, '/', 2)
  )
);
