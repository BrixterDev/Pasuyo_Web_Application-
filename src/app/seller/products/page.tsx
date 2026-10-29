import Link from "next/link";
import Image from "next/image";

import { AppShell } from "@/components/app-shell";
import { createSellerProductAction, updateSellerProductAction } from "@/lib/actions/seller";
import { requireRole } from "@/lib/auth";
import { getSellerProducts } from "@/lib/marketplace";

export default async function SellerProductsPage() {
  const user = await requireRole("seller");
  const products = await getSellerProducts(user.id);

  return (
    <AppShell title="My products" subtitle="Post items, update details, and keep inventory accurate.">
      <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Add product</h2>
        <form action={createSellerProductAction} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Product name</span>
            <input name="name" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500" placeholder="Organic mango" />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Category</span>
            <input name="category_name" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500" placeholder="Meat, Vegetables, Fruits, Bakery..." />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Price</span>
            <input name="price" type="number" min="0" step="0.01" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500" defaultValue={0} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Stock quantity</span>
            <input name="stock_quantity" type="number" min="0" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500" defaultValue={1} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Weight</span>
            <input name="weight" type="number" min="0" step="0.01" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500" defaultValue={1} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Weight unit</span>
            <select name="weight_unit" defaultValue="kg" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500">
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="lb">lb</option>
              <option value="item">item</option>
            </select>
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Description</span>
            <textarea name="description" rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500" placeholder="Fresh, locally sourced, and ready to be delivered." />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Status</span>
            <select name="status" defaultValue="active" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Product images</span>
            <input
              name="images"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-slate-500">Up to 5 images. Maximum 5 MB each.</span>
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white">Post product</button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-bold">Your listings</h2>
        </div>
        {products.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No products posted yet.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {products.map((product) => (
              <div key={product.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-bold">{product.name}</p>
                    <p className="text-sm text-slate-500">{product.category_name ?? "General"} · {product.stock_quantity} in stock · ₱{product.price.toFixed(2)}</p>
                  </div>
                  <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{product.status}</span>
                </div>
                {product.image_url ? (
                  <div className="relative mt-4 h-44 w-full overflow-hidden rounded-2xl bg-slate-200 sm:w-64">
                    <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                  </div>
                ) : null}

                <form action={updateSellerProductAction.bind(null, product.id)} className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Product name</span>
                    <input name="name" defaultValue={product.name} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Category</span>
                    <input name="category_name" defaultValue={product.category_name ?? "General"} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Price</span>
                    <input name="price" type="number" min="0" step="0.01" defaultValue={product.price} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Stock quantity</span>
                    <input name="stock_quantity" type="number" min="0" defaultValue={product.stock_quantity} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Weight</span>
                    <input name="weight" type="number" min="0" step="0.01" defaultValue={product.weight} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Unit</span>
                    <select name="weight_unit" defaultValue={product.weight_unit} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500">
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="lb">lb</option>
                      <option value="item">item</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm md:col-span-2">
                    <span className="font-medium text-slate-700">Description</span>
                    <textarea name="description" defaultValue={product.description ?? ""} rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500" />
                  </label>
                  <label className="space-y-2 text-sm md:col-span-2">
                    <span className="font-medium text-slate-700">Status</span>
                    <select name="status" defaultValue={product.status} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="out_of_stock">Out of stock</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm md:col-span-2">
                    <span className="font-medium text-slate-700">Add product images</span>
                    <input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                    <span className="text-xs text-slate-500">Add up to 5 new images, maximum 5 MB each.</span>
                  </label>
                  <div className="md:col-span-2">
                    <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Save changes</button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6">
        <Link href="/seller" className="text-sm font-semibold text-emerald-700">Back to dashboard</Link>
      </div>
    </AppShell>
  );
}
