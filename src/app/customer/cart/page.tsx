import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { checkoutAction, removeCartItemAction, updateCartItemAction } from "@/lib/actions/cart";
import { requireRole } from "@/lib/auth";
import {
  computeCartDeliveryFee,
  getCustomerCart,
  getCustomerDeliveryAddress,
} from "@/lib/marketplace";
import { MapPin, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

export default async function CustomerCartPage() {
  const user = await requireRole("customer");
  const [cartItems, customerAddress] = await Promise.all([
    getCustomerCart(user.id),
    getCustomerDeliveryAddress(user.id),
  ]);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  const deliveryComputation = computeCartDeliveryFee(cartItems, customerAddress);
  const deliveryFee = deliveryComputation.deliveryFee;
  const total = subtotal + deliveryFee;
  const unavailableItems = cartItems.filter(
    (item) => item.product.status !== "active" || item.product.stock_quantity < item.quantity,
  );

  return (
    <AppShell title="Your cart" subtitle="Review your items before checkout.">
      {cartItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold">Your cart is empty</h2>
          <p className="mt-2 text-sm text-slate-500">Add products from nearby sellers to begin your order.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            {unavailableItems.length > 0 ? (
              <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Some items are unavailable or no longer have enough stock. Remove them or adjust quantities before checkout.
              </p>
            ) : null}
            {cartItems.map((item) => (
              <article key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                <div className="relative h-24 w-full overflow-hidden rounded-2xl bg-slate-200 sm:w-24" aria-label={`${item.product.name} preview`}>
                  {item.product.image_url ? <Image src={item.product.image_url} alt={item.product.name} fill sizes="96px" className="object-cover" /> : <div className="flex h-full items-center justify-center bg-linear-to-br from-emerald-300 via-emerald-500 to-teal-700 text-xs font-bold text-white">{item.product.name.slice(0, 2).toUpperCase()}</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{item.product.name}</p>
                  <p className="text-sm text-slate-500">{item.product.seller_store_name ?? "Pasuyo seller"}</p>
                  <p className="mt-2 font-semibold">₱{item.product.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <form action={updateCartItemAction.bind(null, item.id, Math.max(1, item.quantity - 1))}>
                    <button type="submit" className="rounded-full border border-slate-200 p-2" aria-label={`Decrease ${item.product.name}`}><Minus className="h-4 w-4" /></button>
                  </form>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <form action={updateCartItemAction.bind(null, item.id, item.quantity + 1)}>
                    <button type="submit" className="rounded-full border border-slate-200 p-2" aria-label={`Increase ${item.product.name}`}><Plus className="h-4 w-4" /></button>
                  </form>
                  <form action={removeCartItemAction.bind(null, item.id)}>
                    <button type="submit" className="rounded-full border border-red-200 p-2 text-red-600" aria-label={`Remove ${item.product.name}`}><Trash2 className="h-4 w-4" /></button>
                  </form>
                </div>
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
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="truncate">{deliveryComputation.addressText}</p>
                  <Link href="/customer/profile" className="shrink-0 font-semibold text-emerald-700 underline">Change</Link>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₱{subtotal.toFixed(2)}</span>
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
                <span>₱{total.toFixed(2)}</span>
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
    </AppShell>
  );
}
