create policy "Riders can view their customer ratings"
on public.ratings
for select
using (rider_id = auth.uid());
