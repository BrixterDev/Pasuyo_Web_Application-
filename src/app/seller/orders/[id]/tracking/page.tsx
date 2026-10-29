import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { LiveDeliveryMap } from "@/components/live-delivery-map";
import { requireRole } from "@/lib/auth";
import { getSellerTrackingOrder } from "@/lib/marketplace";

const statusLabels: Record<string, string> = {
  rider_assigned: "Rider assigned",
  picked_up: "Picked up",
  in_transit: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default async function SellerOrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("seller");
  const { id } = await params;
  const order = await getSellerTrackingOrder(id, user.id);

  if (!order) notFound();

  return (
    <AppShell title="Delivery tracking" subtitle={`Order ${order.id.slice(0, 8)} · ${statusLabels[order.status] ?? order.status}`}>
      <LiveDeliveryMap
        orderId={order.id}
        initialStatus={order.status}
        sellerName={order.seller_store_name}
        sellerLatitude={order.seller_latitude}
        sellerLongitude={order.seller_longitude}
        customerLatitude={order.delivery_latitude}
        customerLongitude={order.delivery_longitude}
        riderName={order.rider_name}
        initialRiderLatitude={order.rider_latitude}
        initialRiderLongitude={order.rider_longitude}
        initialRiderLocationUpdatedAt={order.rider_location_updated_at}
      />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <p className="text-sm text-slate-500">Customer destination</p>
          <p className="mt-1 font-medium">{order.delivery_address}</p>
        </div>
        <Link href="/seller/orders" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Back to orders</Link>
      </div>
      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Order receipt</p><h2 className="mt-1 text-xl font-bold">{order.customer_name}&apos;s order</h2></div>
          <span className="text-sm font-semibold text-slate-500">{order.items.reduce((count, item) => count + item.quantity, 0)} item{order.items.reduce((count, item) => count + item.quantity, 0) === 1 ? "" : "s"}</span>
        </div>
        {order.items.length ? (
          <div className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-4 py-4">
                <div><p className="font-semibold">{item.name}</p><p className="text-sm text-slate-500">Quantity: {item.quantity} · ₱{item.unit_price.toFixed(2)} each</p></div>
                <p className="font-semibold">₱{item.subtotal.toFixed(2)}</p>
              </div>
            ))}
          </div>
        ) : <p className="py-4 text-sm text-slate-500">No order items were recorded.</p>}
        <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between"><span>Products subtotal</span><span>₱{order.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Delivery fee</span><span>₱{order.delivery_fee.toFixed(2)}</span></div>
          <div className="flex justify-between pt-2 text-base font-bold"><span>Order total</span><span>₱{order.total_amount.toFixed(2)}</span></div>
        </div>
      </section>
    </AppShell>
  );
}
