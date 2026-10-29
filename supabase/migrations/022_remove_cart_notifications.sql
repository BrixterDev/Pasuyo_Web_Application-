-- Cart additions use the in-page modal only; remove old persisted cart alerts.
delete from public.notifications
where type = 'cart';
