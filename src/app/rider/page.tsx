import { AppShell } from "@/components/app-shell";
import { RiderAvailabilityLocation } from "@/components/rider-availability-location";
import { updateRiderAvailabilityAction } from "@/lib/actions/delivery";
import { requireRole } from "@/lib/auth";
import { getRiderAnalytics, getRiderAvailability, getRiderCompletedDeliveries, getRiderDeliveries } from "@/lib/marketplace";
import { Bike, Clock3, DollarSign, MapPinned, PackageCheck, Star } from "lucide-react";

export default async function RiderDashboardPage() {
  const user = await requireRole("rider");
  const [deliveries, analytics, availability, completedDeliveries] = await Promise.all([
    getRiderDeliveries(user.id),
    getRiderAnalytics(user.id),
    getRiderAvailability(user.id),
    getRiderCompletedDeliveries(user.id),
  ]);

  const cards = [
    { title: "Available jobs", value: String(deliveries.filter((order) => order.status === "ready_for_pickup").length), icon: MapPinned },
    { title: "Active deliveries", value: String(deliveries.filter((order) => ["picked_up", "in_transit"].includes(order.status)).length), icon: Clock3 },
    { title: "Earnings", value: `₱${analytics.totalRevenue.toFixed(2)}`, icon: DollarSign },
    { title: "Completed", value: String(analytics.completedDeliveries), icon: Star },
  ];

  const assignedDelivery = deliveries.find((order) => order.status === "rider_assigned") ?? deliveries.find((order) => ["picked_up", "in_transit"].includes(order.status)) ?? null;

  return (
    <AppShell title="Rider dashboard" subtitle="Manage your availability, delivery jobs, and completed deliveries.">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><p className="text-sm text-slate-500">Availability</p><p className="mt-1 text-xl font-bold">{availability === "online" ? "Online" : "Offline"}{assignedDelivery ? " · On delivery" : ""}</p></div>
        <form action={updateRiderAvailabilityAction.bind(null, availability !== "online")}>
          <button type="submit" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{availability === "online" ? "Set offline" : "Go online"}</button>
        </form>
      </div>

      <div className="mt-4">
        <RiderAvailabilityLocation riderId={user.id} isOnline={availability === "online"} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ title, value, icon: Icon }) => (
          <article key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Icon className="h-5 w-5" aria-hidden="true" /></div>
            <p className="mt-5 text-sm text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </article>
        ))}
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Available deliveries</p><h2 className="mt-1 text-2xl font-bold">Pickup requests</h2></div><Bike className="h-6 w-6 text-emerald-600" aria-hidden="true" /></div>
          <div className="mt-5 space-y-4">
            {deliveries.filter((order) => order.status === "ready_for_pickup").length === 0 ? (
              <div className="text-sm text-slate-500">
                <p>No unassigned pickup requests are available right now.</p>
                <p className="mt-2">Sellers must mark orders ready for pickup; distance is shown when location data is available.</p>
              </div>
            ) : deliveries.filter((order) => order.status === "ready_for_pickup").map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                <div><p className="font-semibold">{order.seller_store_name ?? "Seller"}</p><p className="text-xs text-slate-500">Order {order.id.slice(0, 8)} · {order.delivery_address}</p></div>
                <div className="mt-3 flex items-center justify-between gap-3"><div><p className="font-bold text-emerald-700">₱{order.delivery_fee.toFixed(2)} delivery fee</p>{order.pickup_distance_km !== null ? <p className="text-xs text-slate-500">{order.pickup_distance_km.toFixed(1)} km away</p> : null}</div><a href="/rider/deliveries" className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">View job</a></div>
              </div>
            ))}
          </div>
        </article>
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Active delivery</p>
          {assignedDelivery ? (
            <>
              <h2 className="mt-1 text-2xl font-bold">Order {assignedDelivery.id.slice(0, 8)}</h2>
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><PackageCheck className="h-4 w-4" aria-hidden="true" />{assignedDelivery.status}</div>
                <p className="mt-2 text-sm text-emerald-800/80">{assignedDelivery.customer_name} · {assignedDelivery.delivery_address}</p>
              </div>
              <a href="/rider/deliveries" className="mt-6 inline-flex w-full justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Update delivery status</a>
            </>
          ) : (
            <p className="mt-5 text-sm text-slate-500">No active delivery is assigned to you.</p>
          )}
        </aside>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">History</p>
            <h2 className="mt-1 text-xl font-bold">Completed deliveries</h2>
          </div>
          <p className="text-sm text-slate-500">{analytics.completedDeliveries} total</p>
        </div>
        {completedDeliveries.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Completed deliveries will appear here.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {completedDeliveries.map((delivery) => (
              <div key={delivery.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-5 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{delivery.seller_store_name} · Order {delivery.id.slice(0, 8)}</p>
                  <p className="truncate text-sm text-slate-500">{delivery.item_names || delivery.delivery_address}</p>
                </div>
                <p className="text-sm text-slate-500">{new Date(delivery.completed_at).toLocaleDateString()}</p>
                <p className="font-semibold">₱{delivery.delivery_fee.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
