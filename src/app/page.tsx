import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Boxes,
  MapPinned,
  Search,
  ShoppingBag,
  Store,
  TrendingUp,
  Truck,
} from "lucide-react";
import { getMarketplaceProducts } from "@/lib/marketplace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/permissions";
import { getRoleDashboardPath } from "@/lib/auth-helpers";

const benefits = [
  { icon: Search, title: "Find what you need", text: "Discover local products from trusted sellers in your area." },
  { icon: ShoppingBag, title: "Order in minutes", text: "Build a cart, confirm your location, and checkout securely." },
  { icon: Truck, title: "Track every delivery", text: "See seller, rider, and delivery progress in real time." },
];

const roles = [
  {
    icon: ShoppingBag,
    title: "Customer",
    text: "Browse products, order locally, follow your delivery, and rate experiences.",
    href: "/register?role=customer",
  },
  {
    icon: Store,
    title: "Seller",
    text: "Manage your store, inventory, orders, analytics, and customer relationships.",
    href: "/register?role=seller",
  },
  {
    icon: Bike,
    title: "Rider",
    text: "Accept jobs, navigate to pickups, deliver orders, and build your rating.",
    href: "/register?role=rider",
  },
];

const steps = [
  "Create your account",
  "Choose your role",
  "Browse or sell locally",
  "Track delivery in real time",
];

export default async function HomePage() {
  // Keep the public landing page resilient when Supabase is not configured in
  // a local preview, while showing only real active seller listings when it is.
  const recommendedProducts = await getMarketplaceProducts().catch(() => []);
  const session = await (async () => {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const role = (profile?.role as AppRole | undefined) ?? "customer";
      return { dashboardPath: getRoleDashboardPath(role) };
    } catch {
      return null;
    }
  })();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Pasuyo home" className="flex items-center gap-2 font-black tracking-tight text-emerald-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-lg text-white shadow-sm">P</span>
            <span className="text-xl">Pasuyo</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link className="text-slate-600 transition hover:text-slate-950" href="#how-it-works">How it works</Link>
            <Link className="text-slate-600 transition hover:text-slate-950" href="#for-customers">Customers</Link>
            <Link className="text-slate-600 transition hover:text-slate-950" href="#for-sellers">Sellers</Link>
            <Link className="text-slate-600 transition hover:text-slate-950" href="#for-riders">Riders</Link>
          </nav>
          <div className="flex items-center gap-2">
            {!session ? <Link href="/login" className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex">Login</Link> : null}
            <Link href={session?.dashboardPath ?? "/register?role=customer"} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">{session ? "Dashboard" : "Get started"} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-linear-to-br from-emerald-50 via-white to-amber-50">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-800"><MapPinned className="h-3.5 w-3.5" aria-hidden="true" /> Local marketplace</div>
              <h1 className="max-w-xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Find it. Order it. <span className="text-emerald-600">Pasuyo it.</span></h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Connect local customers, sellers, and riders in one fast, trustworthy delivery marketplace built for everyday commerce.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register?role=customer" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 font-semibold text-white shadow-sm hover:bg-emerald-700"><ShoppingBag className="h-5 w-5" aria-hidden="true" /> Shop nearby</Link>
                <Link href="/register?role=seller" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-800 hover:bg-slate-50">Sell with Pasuyo</Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Verified sellers</span>
                <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Live tracking</span>
                <span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Local growth</span>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-4xl border border-emerald-100 bg-white p-4 shadow-[0_24px_80px_rgba(15,118,110,0.12)]">
                <div className="rounded-3xl bg-slate-950 p-5 text-white">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div><p className="text-xs uppercase tracking-[0.14em] text-emerald-300">Recommendations</p><p className="mt-1 font-semibold">From local sellers</p></div>
                    <div className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold">4.8 ★</div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {recommendedProducts.slice(0, 4).map((product) => (
                      <Link key={product.id} href={`/customer/products/${product.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10">
                        <div className="relative mb-3 h-20 overflow-hidden rounded-xl bg-linear-to-br from-emerald-300 via-emerald-500 to-teal-700">
                          {product.image_url ? <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="160px" /> : null}
                        </div>
                        <p className="truncate font-semibold">{product.name}</p>
                        <p className="text-sm text-emerald-200">₱{product.price.toFixed(2)}</p>
                      </Link>
                    ))}
                    {recommendedProducts.length === 0 ? <p className="col-span-2 py-8 text-center text-sm text-slate-300">Seller products will appear here soon.</p> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-b border-slate-200 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">How Pasuyo works</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From local discovery to doorstep delivery</h2>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-4">
              {steps.map((step, index) => (
                <div key={step} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">{index + 1}</div>
                  <p className="font-semibold">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-3">
              {benefits.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Icon className="h-6 w-6" aria-hidden="true" /></div>
                  <h3 className="mt-5 text-xl font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Choose your role</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">One marketplace. Three ways to participate.</h2>
            </div>
            <div id="for-customers" className="mt-12 grid gap-5 lg:grid-cols-3">
              {roles.map(({ icon: Icon, title, text, href }) => (
                <article key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <Icon className="h-8 w-8 text-emerald-600" aria-hidden="true" />
                  <h3 className="mt-5 text-2xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
                  <Link href={href} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">Join as {title} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-emerald-600 py-20 text-white">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <Boxes className="mx-auto h-12 w-12" aria-hidden="true" />
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Build a stronger local economy with Pasuyo.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-emerald-50/90">From everyday essentials to local specialties, Pasuyo helps communities connect, order, deliver, and grow.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register?role=customer" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-emerald-700">Start shopping</Link>
              <Link href="/register?role=seller" className="inline-flex items-center justify-center rounded-full border border-white/40 bg-transparent px-6 py-3 font-semibold text-white">Become a seller</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 Pasuyo</p>
          <div className="flex gap-6"><Link href="/login">Login</Link><Link href="/register?role=customer">Register</Link></div>
        </div>
      </footer>
    </div>
  );
}
