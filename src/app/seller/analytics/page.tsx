import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getSellerMetrics } from "@/lib/marketplace";

export default async function SellerAnalyticsPage() {
  const user = await requireRole("seller");
  const analytics = await getSellerMetrics(user.id);

  return (
    <AppShell title="Analytics" subtitle="Review revenue, product performance, and your most valuable customers.">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Completed product earnings</p><p className="mt-2 text-2xl font-bold">₱{analytics.totalRevenue.toFixed(2)}</p></article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Completed orders</p><p className="mt-2 text-2xl font-bold">{analytics.completedOrders}</p></article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Pending orders</p><p className="mt-2 text-2xl font-bold">{analytics.pendingOrders}</p></article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Average completed order</p><p className="mt-2 text-2xl font-bold">₱{analytics.averageOrderValue.toFixed(2)}</p></article>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Best sellers</p>
          {analytics.bestSellers.length === 0 ? <p className="mt-5 text-sm text-slate-500">No completed order items yet.</p> : (
            <div className="mt-5 space-y-4">
              {analytics.bestSellers.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">{index + 1}</span><span className="font-medium">{product.name}</span></div>
                  <span className="text-right text-sm text-slate-500">{product.sold} sold · ₱{product.revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Frequent customers</p>
          {analytics.topCustomers.length === 0 ? <p className="mt-5 text-sm text-slate-500">No completed orders recorded yet.</p> : (
            <div className="mt-5 space-y-4">
              {analytics.topCustomers.map((customer, index) => (
                <div key={customer.name} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">{index + 1}</span><div><p className="font-medium">{customer.name}</p><p className="text-xs text-slate-500">{customer.orders} completed orders</p></div></div>
                  <span className="text-sm font-semibold">₱{customer.totalSpent.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </AppShell>
  );
}
