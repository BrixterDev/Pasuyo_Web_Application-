create or replace function public.checkout_cart()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_cart_id uuid;
  v_delivery_address text;
  v_delivery_latitude double precision;
  v_delivery_longitude double precision;
  v_seller_id uuid;
  v_order_id uuid;
  v_subtotal numeric(12, 2);
  v_delivery_fee numeric(12, 2) := 5.50;
begin
  if v_customer_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_customer_id and role = 'customer'::public.app_role
  ) then
    raise exception 'Only customer accounts can check out.';
  end if;

  select id into v_cart_id
  from public.carts
  where user_id = v_customer_id
  for update;

  if v_cart_id is null then
    raise exception 'Your cart is empty.';
  end if;

  select address, latitude, longitude
  into v_delivery_address, v_delivery_latitude, v_delivery_longitude
  from public.customer_addresses
  where user_id = v_customer_id;

  if nullif(trim(v_delivery_address), '') is null then
    raise exception 'A delivery address is required before checkout.';
  end if;

  if not exists (select 1 from public.cart_items where cart_id = v_cart_id) then
    raise exception 'Your cart is empty.';
  end if;

  perform p.id
  from public.products p
  join public.cart_items ci on ci.product_id = p.id
  where ci.cart_id = v_cart_id
  order by p.id
  for update of p;

  if exists (
    select 1
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart_id
      and (p.status <> 'active' or p.stock_quantity < ci.quantity)
  ) then
    raise exception 'A product in your cart is unavailable or no longer has enough stock.';
  end if;

  for v_seller_id in
    select distinct p.seller_id
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart_id
    order by p.seller_id
  loop
    select coalesce(sum(p.price * ci.quantity), 0)
    into v_subtotal
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart_id and p.seller_id = v_seller_id;

    insert into public.orders (
      customer_id, seller_id, delivery_address, delivery_latitude,
      delivery_longitude, subtotal, delivery_fee, total_amount, payment_status
    ) values (
      v_customer_id, v_seller_id, v_delivery_address, v_delivery_latitude,
      v_delivery_longitude, v_subtotal, v_delivery_fee,
      v_subtotal + v_delivery_fee, 'pending'::public.payment_status
    ) returning id into v_order_id;

    insert into public.order_items (
      order_id, product_id, product_name_snapshot, unit_price_snapshot,
      quantity, weight, subtotal
    )
    select v_order_id, p.id, p.name, p.price, ci.quantity,
      p.weight, p.price * ci.quantity
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart_id and p.seller_id = v_seller_id;

    update public.products p
    set stock_quantity = p.stock_quantity - ci.quantity,
        status = case when p.stock_quantity = ci.quantity then 'out_of_stock' else p.status end,
        updated_at = now()
    from public.cart_items ci
    where ci.cart_id = v_cart_id
      and ci.product_id = p.id
      and p.seller_id = v_seller_id;
  end loop;

  delete from public.cart_items where cart_id = v_cart_id;
end;
$$;

revoke all on function public.checkout_cart() from public;
grant execute on function public.checkout_cart() to authenticated;