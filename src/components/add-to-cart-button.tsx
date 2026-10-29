"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";

import { addToCartAction } from "@/lib/actions/cart";

export function AddToCartButton({ productId, disabled }: { productId: string; disabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await addToCartAction(productId, 1);
        setIsOpen(true);
      } catch {
        setError("We could not add this item to your cart. Please try again.");
      }
    });
  }

  return (
    <>
      <form onSubmit={submit} className="flex flex-1 gap-3">
        <button type="submit" disabled={disabled || isPending} className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
          {isPending ? "Adding…" : disabled ? "Out of stock" : "Add to cart"}
        </button>
      </form>
      {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4" role="dialog" aria-modal="true" aria-labelledby="cart-added-title">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700" aria-hidden="true">✓</div>
            <h2 id="cart-added-title" className="mt-4 text-xl font-bold">Added to cart</h2>
            <p className="mt-2 text-sm text-slate-600">This item was added to your shopping cart.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setIsOpen(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Continue shopping</button>
              <Link href="/customer/cart" className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white">View cart</Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
