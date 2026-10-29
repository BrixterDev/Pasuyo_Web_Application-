create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  status_text text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  status_text := replace(initcap(new.status::text), '_', ' ');

  insert into public.notifications (user_id, title, message, type, related_order_id)
  select recipient_id, 'Delivery update', 'Order ' || left(new.id::text, 8) || ' is now ' || status_text || '.', 'order_status', new.id
  from (values (new.customer_id), (new.seller_id), (new.rider_id)) recipients(recipient_id)
  where recipient_id is not null;

  return new;
end;
$$;

drop trigger if exists orders_status_notifications on public.orders;
create trigger orders_status_notifications
after update on public.orders
for each row execute function public.notify_order_status_change();
