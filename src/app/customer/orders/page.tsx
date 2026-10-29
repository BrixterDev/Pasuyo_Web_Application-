import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getCustomerOrders } from "@/lib/marketplace";

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

export default async function CustomerOrdersPage() {
  const user = await requireRole("customer");
  const orders = await getCustomerOrders(user.id);

  return (
    <AppShell title="My orders" subtitle="Track every order and delivery.">
      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-xl font-bold">No orders yet</p>
          <p className="mt-2 text-sm text-slate-500">Your completed purchases will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Order #{order.id.slice(0, 8)}</p>
                  <p className="mt-1 font-bold">{order.seller_store_name ?? "Pasuyo seller"}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{statusLabel[order.status] ?? order.status}</span>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <div><p className="text-slate-500">Items</p><p className="mt-1 font-medium">{order.item_names || `${order.item_count} item${order.item_count === 1 ? "" : "s"}`}</p></div>
                <div><p className="text-slate-500">Total</p><p className="mt-1 font-medium">₱{order.total_amount.toFixed(2)}</p></div>
                <div><p className="text-slate-500">Ordered</p><p className="mt-1 font-medium">{new Date(order.created_at).toLocaleDateString()}</p></div>
                <div><p className="text-slate-500">Delivery</p><p className="mt-1 font-medium">{order.delivery_address}</p></div>
              </div>

              <div className="mt-4 flex gap-3">
                {["picked_up", "in_transit"].includes(order.status) ? (
                  <Link href={`/customer/tracking?order=${order.id}`} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                    Track rider live
                  </Link>
                ) : null}
                <Link href="/customer/products" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Browse products</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
