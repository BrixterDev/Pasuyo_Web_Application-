import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getMarketplaceProducts } from "@/lib/marketplace";

export default async function CustomerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  await requireRole("customer");
  const { query } = await searchParams;
  const products = await getMarketplaceProducts(query);
  const hasSearch = Boolean(query?.trim());

  return (
    <AppShell title="Browse products" subtitle="Discover local essentials from verified sellers.">
      <form action="/customer/products" method="get" className="mb-6">
        <label htmlFor="product-search" className="sr-only">Search products or sellers</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="product-search"
            name="query"
            defaultValue={query ?? ""}
            placeholder="Search products, sellers, or categories"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>
        <div className="mt-3 flex gap-3">
          <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Search</button>
          {hasSearch ? (
            <Link href="/customer/products" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Clear</Link>
          ) : null}
        </div>
      </form>

      {products.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          {hasSearch ? `No products match “${query}”. Try another search.` : "No active products are available right now. Sellers can post new products from their dashboard."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <Link href={`/customer/products/${product.id}`} className="block">
                <div className="relative h-40 overflow-hidden bg-slate-200">
                  {product.image_url ? (
                    <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-linear-to-br from-emerald-300 via-emerald-500 to-teal-700 text-sm font-bold text-white">
                      {product.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <p className="font-bold">{product.name}</p>
                <p className="mt-1 text-sm font-medium text-emerald-700">{product.seller_store_name ?? "Local seller"}</p>
                <p className="mt-1 text-sm text-slate-500">{product.seller_name ? `Sold by ${product.seller_name}` : "Verified Pasuyo seller"}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">₱{product.price.toFixed(2)}</p>
                <p className="mt-1 text-xs text-slate-500">{product.category_name ?? "General"} · {product.stock_quantity} available</p>
                <Link href={`/customer/products/${product.id}`} className="mt-4 inline-flex text-sm font-semibold text-emerald-700">
                  View product →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
