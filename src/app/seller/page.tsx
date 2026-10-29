import { AppShell } from "@/components/app-shell";
import { SellerPickupLocationForm } from "@/components/seller-pickup-location-form";
import { assignSellerOrderRiderAction, createSellerProductAction, updateSellerOrderStatusAction, updateSellerProductAction } from "@/lib/actions/seller";
import { requireRole } from "@/lib/auth";
import { getAvailableRiders, getSellerMetrics, getSellerOrders, getSellerPickupLocation, getSellerProducts } from "@/lib/marketplace";
import { BarChart3, Boxes, DollarSign, PackageCheck, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function SellerDashboardPage() {
  const user = await requireRole("seller");
  const [metrics, orders, products, pickupLocation, riders] = await Promise.all([
    getSellerMetrics(user.id),
    getSellerOrders(user.id),
    getSellerProducts(user.id),
    getSellerPickupLocation(user.id),
    getAvailableRiders(),
  ]);

  const orderStatusLabel: Record<string, string> = {
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

  const cards = [
    { title: "Product earnings", value: `₱${metrics.totalRevenue.toFixed(2)}`, icon: DollarSign },
    { title: "Orders", value: String(metrics.totalOrders), icon: PackageCheck },
    { title: "Active products", value: String(products.filter((product) => product.status === "active").length), icon: Boxes },
    { title: "Pending", value: String(metrics.pendingOrders), icon: TrendingUp },
  ];

  const recentOrders = orders.slice(0, 2);

  return (
    <AppShell title="Seller dashboard" subtitle="Manage your store, orders, inventory, and customer insights.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ title, value, icon: Icon }) => (
          <article key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Icon className="h-5 w-5" aria-hidden="true" /></div>
            <p className="mt-5 text-sm text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </article>
        ))}
      </div>

      <nav aria-label="Seller workspace sections" className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        <a href="#products" className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">Products</a>
        <a href="#orders" className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">Orders</a>
        <a href="#analytics" className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">Analytics</a>
      </nav>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Business overview</p><h2 className="mt-1 text-2xl font-bold">Sales snapshot</h2></div>
            <TrendingUp className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-sm text-emerald-800">Product earnings</p><p className="mt-2 text-2xl font-bold">₱{metrics.totalRevenue.toFixed(2)}</p></div>
            <div className="rounded-2xl bg-slate-100 p-4"><p className="text-sm text-slate-600">Delivered</p><p className="mt-2 text-2xl font-bold">{metrics.completedOrders}</p></div>
            <div className="rounded-2xl bg-slate-100 p-4"><p className="text-sm text-slate-600">Pending</p><p className="mt-2 text-2xl font-bold">{metrics.pendingOrders}</p></div>
          </div>
        </article>
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Incoming orders</p>
          <div className="mt-5 space-y-4">
            {recentOrders.length ? recentOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3"><Link href={`/seller/orders/${order.id}`} className="font-semibold text-emerald-800 hover:underline">{order.customer_name}</Link><span className="text-sm font-bold text-emerald-700">₱{order.subtotal.toFixed(2)} products</span></div>
                <p className="mt-1 text-xs text-slate-500">{order.status}</p>
              </div>
            )) : (
              <p className="text-sm text-slate-500">No incoming orders yet.</p>
            )}
          </div>
          <Link href="/seller/orders" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">Manage orders <span aria-hidden="true">→</span></Link>
          <Link href="/seller/products" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">Manage products <span aria-hidden="true">→</span></Link>
        </aside>
      </section>

      <section id="products" className="mt-8 scroll-mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Seller workspace</p>
            <h2 className="mt-1 text-xl font-bold">Post and manage products</h2>
          </div>
          <Link href="/seller/products" className="text-sm font-semibold text-emerald-700">Manage products <span aria-hidden="true">→</span></Link>
        </div>
        <form action={createSellerProductAction} className="grid gap-4 border-b border-slate-200 p-5 md:grid-cols-2">
          <label className="space-y-2 text-sm"><span className="font-medium">Product name</span><input name="name" required placeholder="Organic mango" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">Category</span><input name="category_name" placeholder="Fruits, bakery, vegetables..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">Price</span><input name="price" type="number" min="0" step="0.01" required defaultValue={0} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">Stock quantity</span><input name="stock_quantity" type="number" min="0" required defaultValue={1} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">Weight</span><input name="weight" type="number" min="0" step="0.01" required defaultValue={1} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">Weight unit</span><select name="weight_unit" defaultValue="kg" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><option value="kg">kg</option><option value="g">g</option><option value="lb">lb</option><option value="item">item</option></select></label>
          <label className="space-y-2 text-sm md:col-span-2"><span className="font-medium">Description</span><textarea name="description" rows={2} placeholder="Product details" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" /></label>
          <label className="space-y-2 text-sm"><span className="font-medium">Listing status</span><select name="status" defaultValue="active" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><option value="active">Active</option><option value="inactive">Inactive</option><option value="out_of_stock">Out of stock</option></select></label>
          <label className="space-y-2 text-sm md:col-span-2"><span className="font-medium">Product images</span><input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /><span className="text-xs text-slate-500">Up to 5 images, maximum 5 MB each.</span></label>
          <div className="flex items-end"><button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white">Post product</button></div>
        </form>
        {products.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-semibold">No products posted yet</p>
            <p className="mt-1 text-sm text-slate-500">Products you post will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {products.map((product) => (
              <div key={product.id} className="p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-semibold">{product.name}</p><p className="text-sm text-slate-500">{product.stock_quantity} in stock · ₱{product.price.toFixed(2)} · {product.status.replaceAll("_", " ")}</p></div>
                </div>
                <details>
                  <summary className="w-fit cursor-pointer text-sm font-semibold text-emerald-700">Edit product</summary>
                  <form action={updateSellerProductAction.bind(null, product.id)} className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="space-y-1 text-sm"><span>Product name</span><input name="name" required defaultValue={product.name} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" /></label>
                    <label className="space-y-1 text-sm"><span>Category</span><input name="category_name" defaultValue={product.category_name ?? ""} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" /></label>
                    <label className="space-y-1 text-sm"><span>Price</span><input name="price" type="number" min="0" step="0.01" required defaultValue={product.price} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" /></label>
                    <label className="space-y-1 text-sm"><span>Stock quantity</span><input name="stock_quantity" type="number" min="0" required defaultValue={product.stock_quantity} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" /></label>
                    <label className="space-y-1 text-sm"><span>Weight</span><input name="weight" type="number" min="0" step="0.01" required defaultValue={product.weight} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" /></label>
                    <label className="space-y-1 text-sm"><span>Weight unit</span><select name="weight_unit" defaultValue={product.weight_unit} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><option value="kg">kg</option><option value="g">g</option><option value="lb">lb</option><option value="item">item</option></select></label>
                    <label className="space-y-1 text-sm md:col-span-2"><span>Description</span><textarea name="description" defaultValue={product.description ?? ""} rows={2} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" /></label>
                    <label className="space-y-1 text-sm"><span>Status</span><select name="status" defaultValue={product.status} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><option value="active">Active</option><option value="inactive">Inactive</option><option value="out_of_stock">Out of stock</option></select></label>
                    <div className="flex items-end"><button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Save product</button></div>
                  </form>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="orders" className="mt-8 scroll-mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Fulfillment</p><h2 className="mt-1 text-xl font-bold">Manage orders</h2></div>
          <Link href="/seller/orders" className="text-sm font-semibold text-emerald-700">Full order list <span aria-hidden="true">→</span></Link>
        </div>
        {orders.length === 0 ? <p className="p-6 text-sm text-slate-500">Customer orders will appear here.</p> : (
          <div className="divide-y divide-slate-200">
            {orders.map((order) => (
              <div key={order.id} className="grid gap-3 p-5 lg:grid-cols-[1fr_1.2fr_auto_auto] lg:items-center">
                <div><p className="font-semibold">{order.customer_name}</p><p className="text-xs text-slate-500">Order {order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString()}</p></div>
                <div><p className="text-sm">{order.item_names || `${order.item_count} item${order.item_count === 1 ? "" : "s"}`}</p><p className="mt-1 text-xs font-semibold text-emerald-800">{orderStatusLabel[order.status] ?? order.status}</p></div>
                <p className="font-semibold">₱{order.subtotal.toFixed(2)}</p>
                <div className="flex flex-wrap gap-2">
                  {order.status === "pending" ? <form action={updateSellerOrderStatusAction.bind(null, order.id, "confirmed")}><button type="submit" className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Accept</button></form> : null}
                  {order.status === "confirmed" ? <form action={updateSellerOrderStatusAction.bind(null, order.id, "preparing")}><button type="submit" className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Prepare</button></form> : null}
                  {order.status === "preparing" ? <form action={updateSellerOrderStatusAction.bind(null, order.id, "ready_for_pickup")}><button type="submit" className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Ready for pickup</button></form> : null}
                  {order.status === "ready_for_pickup" && riders.length > 0 ? (
                    <form action={assignSellerOrderRiderAction.bind(null, order.id)} className="flex items-center gap-2">
                      <select name="rider_id" required defaultValue="" aria-label="Assign rider" className="max-w-48 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs"><option value="" disabled>Select rider</option>{riders.map((rider) => <option key={rider.rider_id} value={rider.rider_id}>{rider.full_name} · {rider.vehicle_type ?? "Vehicle"}</option>)}</select>
                      <button type="submit" className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Assign</button>
                    </form>
                  ) : null}
                  {["rider_assigned", "picked_up", "in_transit"].includes(order.status) ? <Link href={`/seller/orders/${order.id}/tracking`} className="rounded-full border border-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-800">Track</Link> : null}
                  {order.status !== "cancelled" && order.status !== "delivered" ? <form action={updateSellerOrderStatusAction.bind(null, order.id, "cancelled")}><button type="submit" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold">Cancel</button></form> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="analytics" className="mt-8 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Performance</p><h2 className="mt-1 text-xl font-bold">Analytics</h2></div>
          <Link href="/seller/analytics" className="text-sm font-semibold text-emerald-700">Detailed analytics <span aria-hidden="true">→</span></Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Completed product earnings</p><p className="mt-1 text-xl font-bold">₱{metrics.totalRevenue.toFixed(2)}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Completed orders</p><p className="mt-1 text-xl font-bold">{metrics.completedOrders}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Average completed order</p><p className="mt-1 text-xl font-bold">₱{metrics.averageOrderValue.toFixed(2)}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Pending orders</p><p className="mt-1 text-xl font-bold">{metrics.pendingOrders}</p></div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div><h3 className="font-semibold">Best sellers</h3>{metrics.bestSellers.length ? <ol className="mt-3 space-y-2">{metrics.bestSellers.map((item, index) => <li key={item.name} className="flex justify-between gap-3 text-sm"><span>{index + 1}. {item.name}</span><span className="text-slate-500">{item.sold} sold · ₱{item.revenue.toFixed(2)}</span></li>)}</ol> : <p className="mt-2 text-sm text-slate-500">Completed product sales will appear here.</p>}</div>
          <div><h3 className="font-semibold">Frequent customers</h3>{metrics.topCustomers.length ? <ol className="mt-3 space-y-2">{metrics.topCustomers.map((customer, index) => <li key={`${customer.name}-${index}`} className="flex justify-between gap-3 text-sm"><span>{index + 1}. {customer.name}</span><span className="text-slate-500">{customer.orders} completed orders</span></li>)}</ol> : <p className="mt-2 text-sm text-slate-500">Completed customer orders will appear here.</p>}</div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Delivery setup</p>
        <h2 className="mt-1 text-xl font-bold">Store pickup location</h2>
        <p className="mt-1 text-sm text-slate-500">Riders use this pin to find nearby orders and navigate to your store.</p>
        <div className="mt-5">
          <SellerPickupLocationForm
            initialAddress={pickupLocation.address}
            initialLatitude={pickupLocation.latitude}
            initialLongitude={pickupLocation.longitude}
          />
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-emerald-50 p-6">
        <div className="flex items-center gap-3"><BarChart3 className="h-6 w-6 text-emerald-700" aria-hidden="true" /><div><p className="font-bold">Seller workspace ready</p><p className="text-sm text-emerald-800/75">Post inventory, edit listings, and manage order fulfillment from your seller dashboard.</p></div></div>
      </section>
    </AppShell>
  );
}
