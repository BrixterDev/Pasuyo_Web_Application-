import { AppShell } from "@/components/app-shell";
import { assignSellerOrderRiderAction, updateSellerOrderStatusAction } from "@/lib/actions/seller";
import { requireRole } from "@/lib/auth";
import { getAvailableRiders, getSellerOrders } from "@/lib/marketplace";
import Link from "next/link";

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

export default async function SellerOrdersPage() {
  const user = await requireRole("seller");
  const orders = await getSellerOrders(user.id);
  const riders = await getAvailableRiders();

  return (
    <AppShell title="Orders" subtitle="Review, confirm, prepare, and hand off incoming orders.">
      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-xl font-bold">No orders yet</p>
          <p className="mt-2 text-sm text-slate-500">New customer orders will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {orders.map((order) => (
            <div key={order.id} className="grid gap-3 border-t border-slate-200 p-5 md:grid-cols-[1.2fr_1.2fr_0.8fr_1fr_0.9fr] md:items-center">
              <div>
                <Link href={`/seller/orders/${order.id}`} className="font-semibold text-emerald-800 hover:underline">{order.customer_name}</Link>
                <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <span className="text-sm">{order.item_names || `${order.item_count} item${order.item_count === 1 ? "" : "s"}`}</span>
              <span className="font-semibold">₱{order.subtotal.toFixed(2)} products</span>
              <span className="text-sm font-medium text-emerald-700">{statusLabel[order.status] ?? order.status}</span>
              <div className="flex flex-wrap gap-2">
                {["rider_assigned", "picked_up", "in_transit"].includes(order.status) ? (
                  <Link href={`/seller/orders/${order.id}/tracking`} className="rounded-full border border-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-800">Track delivery</Link>
                ) : null}
                {order.status === "pending" ? (
                  <form action={updateSellerOrderStatusAction.bind(null, order.id, "confirmed")}>
                    <button className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Accept</button>
                  </form>
                ) : null}
                {order.status === "confirmed" ? (
                  <form action={updateSellerOrderStatusAction.bind(null, order.id, "preparing")}>
                    <button className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Prepare</button>
                  </form>
                ) : null}
                {order.status === "preparing" ? (
                  <form action={updateSellerOrderStatusAction.bind(null, order.id, "ready_for_pickup")}>
                    <button className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Ready for pickup</button>
                  </form>
                ) : null}
                {order.status === "ready_for_pickup" ? (
                  riders.length > 0 ? (
                    <form action={assignSellerOrderRiderAction.bind(null, order.id)} className="flex items-center gap-2">
                      <select name="rider_id" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium" defaultValue="" required>
                        <option value="" disabled>Select rider</option>
                        {riders.map((rider) => (
                          <option key={rider.rider_id} value={rider.rider_id}>
                            {rider.full_name} · {rider.vehicle_type ?? "Vehicle"} · {rider.rating.toFixed(1)}★
                          </option>
                        ))}
                      </select>
                      <button className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Assign</button>
                    </form>
                  ) : (
                    <span className="text-xs text-slate-500">No online riders</span>
                  )
                ) : null}
                {order.status !== "cancelled" && order.status !== "delivered" ? (
                  <form action={updateSellerOrderStatusAction.bind(null, order.id, "cancelled")}>
                    <button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold">Cancel</button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
