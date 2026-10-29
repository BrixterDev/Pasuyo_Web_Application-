import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { requireRole } from "@/lib/auth";
import { getMarketplaceProduct } from "@/lib/marketplace";

export default async function CustomerProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("customer");
  const { id } = await params;
  const product = await getMarketplaceProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <AppShell title={product.name} subtitle={product.seller_store_name ?? "Local seller"}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-80 bg-slate-200" aria-label={`${product.name} product preview`}>
            {product.image_url ? <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" /> : <div className="flex h-full items-center justify-center bg-linear-to-br from-emerald-300 via-emerald-500 to-teal-700 text-3xl font-bold text-white">{product.name.slice(0, 2).toUpperCase()}</div>}
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">{product.category_name ?? "Featured product"}</p>
                <h2 className="mt-2 text-3xl font-bold">{product.name}</h2>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">₱{product.price.toFixed(2)}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{product.description ?? "Freshly prepared and delivered by a verified local seller."}</p>
          </div>
        </article>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Seller</p>
          <h3 className="mt-2 text-2xl font-bold">{product.seller_store_name ?? "Pasuyo seller"}</h3>
          <p className="mt-3 text-sm text-slate-600">{product.stock_quantity > 0 ? `${product.stock_quantity} available` : "Currently out of stock"}</p>

          <div className="mt-6 space-y-3 text-sm text-slate-600">
            <div className="flex justify-between"><span>Weight</span><span>{product.weight} {product.weight_unit}</span></div>
            <div className="flex justify-between"><span>Availability</span><span className={product.stock_quantity > 0 ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>{product.stock_quantity > 0 ? "In stock" : "Out of stock"}</span></div>
          </div>

          <div className="mt-6 flex gap-3">
            <AddToCartButton productId={product.id} disabled={product.stock_quantity <= 0} />
            <Link href="/customer/products" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Back</Link>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
