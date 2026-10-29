import { AppShell } from "@/components/app-shell";
import { LiveDeliveryMap } from "@/components/live-delivery-map";
import { rateOrderAction } from "@/lib/actions/delivery";
import { requireRole } from "@/lib/auth";
import { getCustomerOrders, getCustomerTrackingOrder } from "@/lib/marketplace";

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

export default async function CustomerTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const user = await requireRole("customer");
  const [{ order: requestedOrderId }, orders] = await Promise.all([
    searchParams,
    getCustomerOrders(user.id),
  ]);
  const activeOrder = (requestedOrderId ? orders.find((order) => order.id === requestedOrderId && (order.status === "picked_up" || order.status === "in_transit")) : null)
    ?? orders.find((order) => order.status === "picked_up" || order.status === "in_transit")
    ?? null;

  if (!activeOrder) {
    return (
      <AppShell title="Live tracking" subtitle="You do not have an active delivery.">
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Rider tracking becomes available after the rider picks up your order.
        </div>
      </AppShell>
    );
  }

  const order = await getCustomerTrackingOrder(activeOrder.id, user.id);

  return (
    <AppShell title="Live tracking" subtitle={`Order ${activeOrder.id.slice(0, 8)}`}>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <LiveDeliveryMap
          orderId={activeOrder.id}
          initialStatus={order?.status ?? activeOrder.status}
          sellerName={order?.seller_store_name ?? "Seller"}
          sellerLatitude={order?.seller_latitude ?? null}
          sellerLongitude={order?.seller_longitude ?? null}
          customerLatitude={order?.delivery_latitude ?? null}
          customerLongitude={order?.delivery_longitude ?? null}
          riderName={order?.rider_name ?? null}
          initialRiderLatitude={order?.rider_latitude ?? null}
          initialRiderLongitude={order?.rider_longitude ?? null}
          initialRiderLocationUpdatedAt={order?.rider_location_updated_at ?? null}
        />

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Delivery status</p>
          <h2 className="mt-2 text-2xl font-bold">{statusLabel[order?.status ?? activeOrder.status] ?? activeOrder.status}</h2>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between"><span>Seller</span><span className="font-semibold">{order?.seller_store_name ?? "Pasuyo seller"}</span></div>
            <div className="flex items-center justify-between"><span>Delivery rider</span><span className="font-semibold">{order?.rider_name ?? "Not assigned yet"}</span></div>
            <div className="flex items-center justify-between"><span>Address</span><span className="max-w-40 text-right font-semibold">{order?.delivery_address ?? "Not available"}</span></div>
            <div className="flex items-center justify-between"><span>Total</span><span className="font-semibold">₱{order?.total_amount.toFixed(2) ?? activeOrder.total_amount.toFixed(2)}</span></div>
          </div>

          {order?.can_rate ? (
            <form action={rateOrderAction.bind(null, order.id)} className="mt-6 space-y-3 border-t border-slate-200 pt-5">
              <label className="block text-sm font-medium text-slate-700">Rate your rider</label>
              <select name="rating" defaultValue="5" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Average</option>
                <option value="2">2 - Poor</option>
                <option value="1">1 - Very poor</option>
              </select>
              <textarea name="comment" rows={3} placeholder="Optional feedback" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
              <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Submit rating</button>
            </form>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}
