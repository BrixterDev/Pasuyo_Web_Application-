import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getSellerTrackingOrder } from "@/lib/marketplace";

export default async function SellerOrderReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("seller");
  const { id } = await params;
  const order = await getSellerTrackingOrder(id, user.id);
  if (!order) notFound();

  return (
    <AppShell title="Customer order receipt" subtitle={`Order ${order.id.slice(0, 8)}`}>
      <section className="max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div><p className="text-sm text-slate-500">Customer</p><h2 className="text-2xl font-bold">{order.customer_name}</h2><p className="mt-1 text-sm text-slate-500">{new Date(order.created_at).toLocaleString()}</p></div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold capitalize text-emerald-700">{order.status.replaceAll("_", " ")}</span>
        </div>
        <div className="divide-y divide-slate-100">
          {order.items.map((item) => <div key={item.name} className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold">{item.name}</p><p className="text-sm text-slate-500">Quantity: {item.quantity} · ₱{item.unit_price.toFixed(2)} each</p></div><p className="font-semibold">₱{item.subtotal.toFixed(2)}</p></div>)}
        </div>
        <div className="space-y-2 border-t border-slate-100 pt-4 text-sm"><div className="flex justify-between"><span>Products subtotal</span><span>₱{order.subtotal.toFixed(2)}</span></div><div className="flex justify-between"><span>Delivery fee</span><span>₱{order.delivery_fee.toFixed(2)}</span></div><div className="flex justify-between pt-2 text-base font-bold"><span>Total</span><span>₱{order.total_amount.toFixed(2)}</span></div></div>
        <div className="mt-6 flex flex-wrap gap-3"><Link href={`/seller/orders/${order.id}/tracking`} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">View tracking</Link><Link href="/seller/orders" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Back to order history</Link></div>
      </section>
    </AppShell>
  );
}
