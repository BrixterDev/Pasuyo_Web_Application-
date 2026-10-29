create extension if not exists "pgcrypto";

create type app_role as enum ('customer', 'seller', 'rider', 'admin');
create type order_status as enum (
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'rider_assigned',
  'picked_up',
  'in_transit',
  'delivered',
  'cancelled'
);
create type payment_status as enum ('pending', 'paid', 'failed', 'cash_on_delivery', 'refunded');
create type rider_availability as enum ('offline', 'online');
create type rating_value as enum ('1', '2', '3', '4', '5');

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  phone_number text,
  profile_image text,
  role app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  address text,
  formatted_address text,
  location_timestamp timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists seller_profiles (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null unique references profiles(id) on delete cascade,
  store_name text not null,
  store_description text,
  store_image text,
  latitude double precision,
  longitude double precision,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rider_profiles (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null unique references profiles(id) on delete cascade,
  availability rider_availability not null default 'offline',
  vehicle_type text,
  license_number text,
  profile_image text,
  latitude double precision,
  longitude double precision,
  rating numeric(3,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references seller_profiles(seller_id) on delete cascade,
  name text not null,
  description text,
  category_id uuid references categories(id),
  price numeric(12,2) not null check (price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  weight numeric(10,2) not null default 0,
  weight_unit text not null default 'kg',
  status text not null default 'active' check (status in ('active', 'inactive', 'out_of_stock')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id),
  seller_id uuid not null references seller_profiles(seller_id),
  rider_id uuid references rider_profiles(rider_id),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null check (delivery_fee >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  delivery_address text not null,
  delivery_latitude double precision,
  delivery_longitude double precision,
  seller_latitude double precision,
  seller_longitude double precision,
  status order_status not null default 'pending',
  payment_status payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  checked_out_at timestamptz
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name_snapshot text not null,
  unit_price_snapshot numeric(12,2) not null,
  quantity integer not null check (quantity > 0),
  weight numeric(10,2) not null default 0,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create table if not exists order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  previous_status order_status,
  new_status order_status not null,
  changed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists rider_locations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  rider_id uuid not null references rider_profiles(rider_id),
  latitude double precision not null,
  longitude double precision not null,
  accuracy numeric(8,2),
  heading numeric(5,2),
  speed numeric(8,2),
  recorded_at timestamptz not null default now()
);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders(id) on delete cascade,
  customer_id uuid not null references profiles(id),
  rider_id uuid not null references rider_profiles(rider_id),
  rating rating_value not null,
  comment text,
  created_at timestamptz not null default now(),
  unique (order_id, customer_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  related_order_id uuid references orders(id),
  created_at timestamptz not null default now()
);

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_seller_status on products(seller_id, status);
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_price on products(price);
create index if not exists idx_products_name_trgm on products using gin (to_tsvector('english', coalesce(name, '')));
create index if not exists idx_orders_customer on orders(customer_id, created_at desc);
create index if not exists idx_orders_seller on orders(seller_id, created_at desc);
create index if not exists idx_orders_rider on orders(rider_id, status);
create index if not exists idx_rider_locations_order_time on rider_locations(order_id, recorded_at desc);
create index if not exists idx_notifications_user_read on notifications(user_id, is_read, created_at desc);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
begin
  user_role := coalesce(new.raw_user_meta_data ->> 'role', 'customer');

  insert into public.profiles (id, email, role)
  values (new.id, new.email, user_role::app_role)
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

create trigger handle_new_user_trigger
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger profiles_updated_at
before update on profiles
for each row execute function update_updated_at_column();

create trigger seller_profiles_updated_at
before update on seller_profiles
for each row execute function update_updated_at_column();

create trigger rider_profiles_updated_at
before update on rider_profiles
for each row execute function update_updated_at_column();

create trigger customer_addresses_updated_at
before update on customer_addresses
for each row execute function update_updated_at_column();

create trigger products_updated_at
before update on products
for each row execute function update_updated_at_column();

create trigger carts_updated_at
before update on carts
for each row execute function update_updated_at_column();

create trigger orders_updated_at
before update on orders
for each row execute function update_updated_at_column();

alter table profiles enable row level security;
alter table customer_addresses enable row level security;
alter table seller_profiles enable row level security;
alter table rider_profiles enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table rider_locations enable row level security;
alter table ratings enable row level security;
alter table notifications enable row level security;
alter table favorites enable row level security;
alter table search_history enable row level security;

create policy "Profiles are viewable by owner or admin" on profiles
for select using (auth.uid() = id or auth.jwt() ->> 'role' = 'admin');

create policy "Users can update own profile" on profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Customers manage own address" on customer_addresses
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Seller profiles visible to authenticated users" on seller_profiles
for select using (auth.role() = 'authenticated');

create policy "Sellers manage their profile" on seller_profiles
for all using (seller_id = auth.uid()) with check (seller_id = auth.uid());

create policy "Rider profiles are visible to authenticated users" on rider_profiles
for select using (auth.role() = 'authenticated');

create policy "Riders manage own profile" on rider_profiles
for all using (rider_id = auth.uid()) with check (rider_id = auth.uid());

create policy "Active products are public" on products
for select using (status = 'active');

create policy "Sellers manage own products" on products
for all using (seller_id = auth.uid()) with check (seller_id = auth.uid());

create policy "Product images owner access" on product_images
for all using (
  exists (select 1 from products p where p.id = product_images.product_id and p.seller_id = auth.uid())
) with check (
  exists (select 1 from products p where p.id = product_images.product_id and p.seller_id = auth.uid())
);

create policy "Authenticated users manage carts" on carts
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Authenticated users manage cart items" on cart_items
for all using (
  exists (select 1 from carts c where c.id = cart_items.cart_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from carts c where c.id = cart_items.cart_id and c.user_id = auth.uid())
);

create policy "Customers own order access" on orders
for select using (customer_id = auth.uid() or seller_id = auth.uid() or rider_id = auth.uid() or auth.jwt() ->> 'role' = 'admin');
create policy "Customers create orders" on orders
for insert with check (customer_id = auth.uid());
create policy "Seller or rider maintain assigned order" on orders
for update using (
  seller_id = auth.uid() or rider_id = auth.uid() or auth.jwt() ->> 'role' = 'admin'
) with check (
  seller_id = auth.uid() or rider_id = auth.uid() or auth.jwt() ->> 'role' = 'admin'
);

create policy "Order items accessible to owning parties" on order_items
for select using (
  exists (select 1 from orders o where o.id = order_items.order_id and (
    o.customer_id = auth.uid() or o.seller_id = auth.uid() or o.rider_id = auth.uid() or auth.jwt() ->> 'role' = 'admin'
  ))
);

create policy "Order status events are readable to related parties" on order_status_history
for select using (
  exists (select 1 from orders o where o.id = order_status_history.order_id and (
    o.customer_id = auth.uid() or o.seller_id = auth.uid() or o.rider_id = auth.uid() or auth.jwt() ->> 'role' = 'admin'
  ))
);

create policy "Rider location updates owner access" on rider_locations
for all using (
  rider_id = auth.uid() or exists (
    select 1 from orders o where o.id = rider_locations.order_id and (
      o.customer_id = auth.uid() or o.seller_id = auth.uid() or auth.jwt() ->> 'role' = 'admin'
    )
  )
) with check (
  rider_id = auth.uid() or exists (
    select 1 from orders o where o.id = rider_locations.order_id and (
      o.customer_id = auth.uid() or o.seller_id = auth.uid() or auth.jwt() ->> 'role' = 'admin'
    )
  )
);

create policy "Customer ratings are ownable" on ratings
for all using (customer_id = auth.uid() or auth.jwt() ->> 'role' = 'admin') with check (customer_id = auth.uid());

create policy "User notifications are private" on notifications
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Favorites are user private" on favorites
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Search history user private" on search_history
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.generate_order_number()
returns text as $$
  select 'PS-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8);
$$ language sql stable;

create or replace function public.ensure_order_status_history()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_status_history(order_id, previous_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger orders_status_history
after update on orders
for each row execute function public.ensure_order_status_history();
