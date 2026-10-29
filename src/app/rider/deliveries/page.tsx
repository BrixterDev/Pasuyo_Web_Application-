import { AppShell } from "@/components/app-shell";
import { LiveDeliveryMap } from "@/components/live-delivery-map";
import { LiveRiderJobFeed } from "@/components/live-rider-job-feed";
import { RiderAvailabilityLocation } from "@/components/rider-availability-location";
import { RiderLocationReporter } from "@/components/rider-location-reporter";
import { acceptDeliveryAction, claimDeliveryAction, updateRiderOrderStatusAction } from "@/lib/actions/delivery";
import { requireRole } from "@/lib/auth";
import { getRiderAvailability, getRiderDeliveries } from "@/lib/marketplace";

const statusLabel: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  rider_assigned: "Rider assigned",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default async function RiderDeliveriesPage() {
  const user = await requireRole("rider");
  const [deliveries, availability] = await Promise.all([
    getRiderDeliveries(user.id),
    getRiderAvailability(user.id),
  ]);

  return (
    <AppShell title="Delivery jobs" subtitle="Accept orders, track progress, and update delivery status.">
      <LiveRiderJobFeed />
      <div className="mb-5">
        <RiderAvailabilityLocation riderId={user.id} isOnline={availability === "online"} />
      </div>
      <div className="space-y-4">
        {deliveries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-semibold">No delivery jobs are available</p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Unassigned orders marked ready for pickup are available to accept. Distance is informational and will not hide a job.</p>
          </div>
        ) : deliveries.map((delivery) => (
          <article key={delivery.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">Order {delivery.id.slice(0, 8)}</p>
                <p className="mt-1 text-xl font-bold">{delivery.seller_store_name ?? "Seller"}</p>
                <p className="mt-1 text-sm text-slate-600">Pickup: {delivery.seller_address ?? "Store location shown on map"}</p>
                <p className="mt-1 text-sm text-slate-500">Customer: {delivery.customer_name} · {delivery.delivery_address}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                {statusLabel[delivery.status] ?? delivery.status}
              </span>
            </div>

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <span>Items: {delivery.item_names || "Order items"}</span>
              <span className="font-semibold">Delivery earnings: ₱{delivery.delivery_fee.toFixed(2)}</span>
              {delivery.pickup_distance_km !== null ? (
                <span className="font-medium text-emerald-800">Pickup · {delivery.pickup_distance_km.toFixed(1)} km away</span>
              ) : delivery.status === "ready_for_pickup" ? (
                <span className="text-amber-800">Your location is detected automatically while you are online.</span>
              ) : null}
            </div>

            {delivery.status === "ready_for_pickup" ? (
              <form action={claimDeliveryAction.bind(null, delivery.id)} className="mt-5">
                <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Accept delivery request</button>
              </form>
            ) : null}

            {delivery.status === "rider_assigned" ? (
              <form action={acceptDeliveryAction.bind(null, delivery.id)} className="mt-5">
                <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Confirm pickup</button>
              </form>
            ) : null}

            {delivery.status === "picked_up" ? (
              <form action={updateRiderOrderStatusAction.bind(null, delivery.id, "in_transit")} className="mt-5">
                <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Start transit</button>
              </form>
            ) : null}

            {delivery.status === "in_transit" ? (
              <form action={updateRiderOrderStatusAction.bind(null, delivery.id, "delivered")} className="mt-5">
                <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Mark delivered</button>
              </form>
            ) : null}

            <div className="mt-5">
              <LiveDeliveryMap
                orderId={delivery.id}
                initialStatus={delivery.status}
                sellerName={delivery.seller_store_name ?? "Seller"}
                sellerLatitude={delivery.seller_latitude}
                sellerLongitude={delivery.seller_longitude}
                customerLatitude={delivery.delivery_latitude}
                customerLongitude={delivery.delivery_longitude}
                riderName="You"
                initialRiderLatitude={delivery.rider_latitude}
                initialRiderLongitude={delivery.rider_longitude}
                initialRiderLocationUpdatedAt={delivery.rider_location_updated_at}
              />
            </div>
            {["rider_assigned", "picked_up", "in_transit"].includes(delivery.status) ? (
              <RiderLocationReporter orderId={delivery.id} riderId={user.id} />
            ) : null}
          </article>
        ))}
      </div>
    </AppShell>
  );
}
