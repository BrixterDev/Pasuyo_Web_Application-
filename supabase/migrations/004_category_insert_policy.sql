alter table public.categories enable row level security;

drop policy if exists "Categories are publicly viewable" on public.categories;
create policy "Categories are publicly viewable" on public.categories
for select using (true);

drop policy if exists "Sellers can create categories" on public.categories;
create policy "Sellers can create categories" on public.categories
for insert with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'seller'::public.app_role
  )
);