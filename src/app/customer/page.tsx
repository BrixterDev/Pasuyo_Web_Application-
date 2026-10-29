import Image from "next/image";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { LiveCustomerOrders } from "@/components/live-customer-orders";
import { requireRole } from "@/lib/auth";
import { computeCartDeliveryFee, getCustomerCart, getCustomerDeliveryAddress, getCustomerOrders, getMarketplaceProducts } from "@/lib/marketplace";
import { ArrowRight, MapPin, Minus, Package, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { removeCartItemAction, updateCartItemAction, checkoutAction } from "@/lib/actions/cart";

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

export default async function CustomerDashboardPage() {
  const user = await requireRole("customer");
  const [products, cart, orders, customerAddress] = await Promise.all([
    getMarketplaceProducts(),
    getCustomerCart(user.id),
    getCustomerOrders(user.id),
    getCustomerDeliveryAddress(user.id),
  ]);

  const activeOrders = orders.filter((order) => !["delivered", "cancelled"].includes(order.status));
  const currentOrder = activeOrders[0] ?? null;
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);
  const cartSubtotal = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const deliveryComputation = computeCartDeliveryFee(cart, customerAddress);
  const deliveryFee = deliveryComputation.deliveryFee;
  const cartTotal = cartSubtotal + deliveryFee;
  const unavailableItems = cart.filter((item) => item.product.status !== "active" || item.product.stock_quantity < item.quantity);
  const currentStepByStatus: Record<string, number> = {
    pending: 0,
    confirmed: 1,
    preparing: 2,
    ready_for_pickup: 3,
    rider_assigned: 4,
    picked_up: 5,
    in_transit: 6,
    delivered: 7,
  };
  const orderSteps = [
    "Order placed",
    "Seller confirmed",
    "Preparing order",
    "Ready for pickup",
    "Rider assigned",
    "Picked up",
    "On the way",
    "Delivered",
  ];

  const mobileNav = (
    <div className="grid grid-cols-4 text-xs font-semibold">
      <a href="#products" className="flex flex-col items-center gap-1 py-2 text-emerald-700"><Search className="h-5 w-5" aria-hidden="true" />Products</a>
      <a href="#orders" className="flex flex-col items-center gap-1 py-2 text-slate-500"><Package className="h-5 w-5" aria-hidden="true" />Orders</a>
      <a href="#tracking" className="flex flex-col items-center gap-1 py-2 text-slate-500"><ArrowRight className="h-5 w-5" aria-hidden="true" />Tracking</a>
      <a href="#cart" className="flex flex-col items-center gap-1 py-2 text-slate-500"><ShoppingBag className="h-5 w-5" aria-hidden="true" />Cart</a>
    </div>
  );

  return (
    <AppShell title="Customer dashboard" subtitle="Browse products, manage orders, track deliveries, and review your cart in one place." mobileNav={mobileNav}>
      <LiveCustomerOrders customerId={user.id} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Package className="h-5 w-5" aria-hidden="true" /></div>
          <p className="mt-5 text-sm text-slate-500">Active orders</p>
          <p className="mt-1 text-2xl font-bold">{activeOrders.length}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700"><ShoppingBag className="h-5 w-5" aria-hidden="true" /></div>
          <p className="mt-5 text-sm text-slate-500">Cart items</p>
          <p className="mt-1 text-2xl font-bold">{cartItemCount}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Search className="h-5 w-5" aria-hidden="true" /></div>
          <p className="mt-5 text-sm text-slate-500">Products available</p>
          <p className="mt-1 text-2xl font-bold">{products.length}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><ArrowRight className="h-5 w-5" aria-hidden="true" /></div>
          <p className="mt-5 text-sm text-slate-500">Cart total</p>
          <p className="mt-1 text-2xl font-bold">₱{cartTotal.toFixed(2)}</p>
        </article>
      </section>

      <section id="products" className="mt-8 scroll-mt-24">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Products</p>
            <h2 className="text-2xl font-bold">Shop nearby sellers</h2>
          </div>
          <Link href="/customer/products" className="text-sm font-semibold text-emerald-700">View all products →</Link>
        </div>
        {products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No active products are available right now.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <Link href={`/customer/products/${product.id}`} className="block">
                  <div className="relative h-40 overflow-hidden bg-slate-200">
                    {product.image_url ? <Image src={product.image_url} alt={product.name} fill className="object-cover" /> : <div className="flex h-full items-center justify-center bg-linear-to-br from-emerald-300 via-emerald-500 to-teal-700 text-sm font-bold text-white">{product.name.slice(0, 2).toUpperCase()}</div>}
                  </div>
                </Link>
                <div className="p-4">
                  <p className="font-bold">{product.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{product.seller_store_name ?? "Local seller"} · ₱{product.price.toFixed(2)}</p>
                  <p className="mt-1 text-xs text-slate-500">{product.category_name ?? "General"} · {product.stock_quantity} available</p>
                  <Link href={`/customer/products/${product.id}`} className="mt-4 inline-flex text-sm font-semibold text-emerald-700">View product →</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="orders" className="mt-10 scroll-mt-24">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Orders</p>
            <h2 className="text-2xl font-bold">Order management</h2>
          </div>
          <Link href="/customer/orders" className="text-sm font-semibold text-emerald-700">View all orders →</Link>
        </div>
        {orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No orders yet. Your purchases will appear here.</div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-semibold text-slate-500">Order #{order.id.slice(0, 8)}</p><p className="mt-1 font-bold">{order.seller_store_name ?? "Pasuyo seller"}</p></div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{statusLabel[order.status] ?? order.status}</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                  <div><p className="text-slate-500">Items</p><p className="mt-1 font-medium">{order.item_names || `${order.item_count} item${order.item_count === 1 ? "" : "s"}`}</p></div>
                  <div><p className="text-slate-500">Total</p><p className="mt-1 font-medium">₱{order.total_amount.toFixed(2)}</p></div>
                  <div><p className="text-slate-500">Ordered</p><p className="mt-1 font-medium">{new Date(order.created_at).toLocaleDateString()}</p></div>
                  <div><p className="text-slate-500">Delivery</p><p className="mt-1 font-medium">{order.delivery_address}</p></div>
                </div>
                <div className="mt-4 flex gap-3"><Link href={`/customer/tracking?order=${order.id}`} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Track order</Link><Link href="/customer/orders" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">View details</Link></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="tracking" className="mt-10 scroll-mt-24">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Tracking</p>
            <h2 className="text-2xl font-bold">Live delivery tracking</h2>
          </div>
          {currentOrder ? <Link href={`/customer/tracking?order=${currentOrder.id}`} className="text-sm font-semibold text-emerald-700">Open live map →</Link> : null}
        </div>
        {currentOrder ? (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-slate-500">Current delivery</p><h3 className="text-xl font-bold">{currentOrder.seller_store_name ?? "Seller order"}</h3><p className="mt-1 text-sm text-slate-500">Order #{currentOrder.id.slice(0, 8)}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{statusLabel[currentOrder.status] ?? currentOrder.status}</span></div>
            <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {orderSteps.map((label, index) => { const completed = index <= (currentStepByStatus[currentOrder.status] ?? -1); return <li key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3"><span className={`grid h-6 w-6 place-items-center rounded-full ${completed ? "bg-emerald-600" : "bg-slate-200"}`} aria-hidden="true"><span className="h-2 w-2 rounded-full bg-white" /></span><span className="text-sm font-medium">{label}</span></li>; })}
            </ol>
            <Link href={`/customer/tracking?order=${currentOrder.id}`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Track delivery live <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </article>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Place an order to view its live delivery progress.</div>
        )}
      </section>

      <section id="cart" className="mt-10 scroll-mt-24">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Cart</p>
            <h2 className="text-2xl font-bold">Shopping cart ({cartItemCount} item{cartItemCount === 1 ? "" : "s"})</h2>
          </div>
          <Link href="/customer/cart" className="text-sm font-semibold text-emerald-700">Open cart →</Link>
        </div>
        {cart.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><ShoppingBag className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" /><h3 className="mt-4 text-xl font-bold">Your cart is empty</h3><p className="mt-2 text-sm text-slate-500">Add products from nearby sellers to begin your order.</p></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-4">
              {unavailableItems.length > 0 ? <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Some items are unavailable or no longer have enough stock. Remove them or adjust quantities before checkout.</p> : null}
              {cart.map((item) => (
                <article key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                  <div className="relative h-24 w-full overflow-hidden rounded-2xl bg-slate-200 sm:w-24">{item.product.image_url ? <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" /> : <div className="flex h-full items-center justify-center bg-linear-to-br from-emerald-300 via-emerald-500 to-teal-700 text-xs font-bold text-white">{item.product.name.slice(0, 2).toUpperCase()}</div>}</div>
                  <div className="min-w-0 flex-1"><p className="font-bold">{item.product.name}</p><p className="text-sm text-slate-500">{item.product.seller_store_name ?? "Pasuyo seller"}</p><p className="mt-2 font-semibold">₱{item.product.price.toFixed(2)}</p></div>
                  <div className="flex items-center gap-3 sm:justify-end"><form action={updateCartItemAction.bind(null, item.id, Math.max(1, item.quantity - 1))}><button type="submit" className="rounded-full border border-slate-200 p-2" aria-label={`Decrease ${item.product.name}`}><Minus className="h-4 w-4" /></button></form><span className="w-6 text-center text-sm font-semibold">{item.quantity}</span><form action={updateCartItemAction.bind(null, item.id, item.quantity + 1)}><button type="submit" className="rounded-full border border-slate-200 p-2" aria-label={`Increase ${item.product.name}`}><Plus className="h-4 w-4" /></button></form><form action={removeCartItemAction.bind(null, item.id)}><button type="submit" className="rounded-full border border-red-200 p-2 text-red-600" aria-label={`Remove ${item.product.name}`}><Trash2 className="h-4 w-4" /></button></form></div>
                </article>
              ))}
            </div>
            <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Order summary</p>

              {!deliveryComputation.hasAddress ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-semibold">No delivery address saved</p>
                      <p className="mt-0.5 text-amber-800">
                        Delivery fee is estimated at the ₱50.00 minimum.{" "}
                        <Link href="/customer/profile" className="font-semibold underline">
                          Set delivery location
                        </Link>{" "}
                        for accurate travel distance computation.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Delivering to:
                  </p>
                  <p className="mt-1 truncate">{deliveryComputation.addressText}</p>
                </div>
              )}

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₱{cartSubtotal.toFixed(2)}</span>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <div className="flex justify-between font-medium">
                    <span>Delivery fee ({deliveryComputation.sellerCount} {deliveryComputation.sellerCount === 1 ? "seller" : "sellers"})</span>
                    <span>₱{deliveryFee.toFixed(2)}</span>
                  </div>

                  {deliveryComputation.sellers.map((s) => (
                    <div key={s.sellerId} className="flex justify-between text-xs text-slate-500 pl-2">
                      <span className="truncate pr-2">• {s.sellerStoreName}</span>
                      <span className="shrink-0 text-right">
                        {s.distanceKm !== null ? (
                          s.isWithinMinimum ? (
                            `₱${s.deliveryFee.toFixed(2)} (${s.distanceKm.toFixed(1)} km, within 5 km min)`
                          ) : (
                            `₱${s.deliveryFee.toFixed(2)} (${s.distanceKm.toFixed(1)} km: ₱50 + ${s.extraKm} km @ ₱20)`
                          )
                        ) : (
                          `₱${s.deliveryFee.toFixed(2)} (5 km minimum)`
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold">
                  <span>Total</span>
                  <span>₱{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <form action={checkoutAction} className="mt-6">
                <button
                  type="submit"
                  disabled={unavailableItems.length > 0}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Checkout
                </button>
              </form>
            </aside>
          </div>
        )}
      </section>
    </AppShell>
  );
}
