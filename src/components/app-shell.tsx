import Link from "next/link";

import { getCustomerCart } from "@/lib/marketplace";
import { logoutAction } from "@/lib/actions/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  mobileNav?: React.ReactNode;
};

export async function AppShell({ title, subtitle, children, mobileNav }: AppShellProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role, first_name, last_name").eq("id", user.id).maybeSingle()
    : { data: null };
  const customerCartItemCount = user
    ? (await getCustomerCart(user.id)).reduce((count, item) => count + item.quantity, 0)
    : 0;
  const { count: unreadNotificationCount } = user
    ? await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false)
    : { count: 0 };

  const roleNavigation = profile?.role === "seller"
    ? [
      { href: "/seller", label: "Overview" },
      { href: "/seller/products", label: "Products" },
      { href: "/seller/orders", label: "Orders" },
      { href: "/seller/analytics", label: "Analytics" },
    ]
    : profile?.role === "rider"
      ? [
        { href: "/rider", label: "Dashboard" },
        { href: "/rider/deliveries", label: "Delivery jobs" },
      ]
      : profile?.role === "customer"
        ? [
          { href: "/customer", label: "Dashboard" },
          { href: "/customer/products", label: "Products" },
          { href: "/customer/orders", label: "Orders" },
          { href: "/customer/tracking", label: "Tracking" },
          { href: "/customer/cart", label: `Cart (${customerCartItemCount})` },
        ]
        : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight text-emerald-700" aria-label="Pasuyo home">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-lg text-white shadow-sm">P</span>
            <span className="hidden text-xl sm:inline">Pasuyo</span>
          </Link>

          <div className="flex-1" />
          {user ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link href="/profile" className="rounded-xl px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800 sm:px-3 sm:text-sm">Profile</Link>
              <Link href="/notifications" className="rounded-xl px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800 sm:px-3 sm:text-sm">Notifications{unreadNotificationCount ? ` (${unreadNotificationCount})` : ""}</Link>
              <Link href="/settings" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800 sm:inline-flex">Settings</Link>
              <form action={logoutAction}>
                <button type="submit" className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 sm:px-3 sm:text-sm">Log out</button>
              </form>
            </div>
          ) : null}
        </div>
        {roleNavigation.length ? (
          <nav aria-label={`${profile?.role ?? "Account"} navigation`} className="border-t border-slate-100">
            <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-3 pb-px sm:px-6 lg:px-8">
              {roleNavigation.map((item) => (
                <Link key={item.href} href={item.href} className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-600 hover:text-emerald-800">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6 sm:gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Pasuyo marketplace</p>
            <h1 className="mt-1 text-xl font-bold leading-tight tracking-[-0.02em] text-slate-950 sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {children}
      </main>
      {mobileNav ? <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] md:hidden">{mobileNav}</nav> : null}
      <div className={cn(mobileNav && "pb-20 md:pb-0")} />
    </div>
  );
}
