import Link from "next/link";
import { ArrowLeft, CheckCircle2, UserRound } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { registerAction } from "@/lib/actions/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoleDashboardPath } from "@/lib/auth-helpers";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  const selectedRole = params.role ?? "customer";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    redirect(profile?.role ? getRoleDashboardPath(profile.role) : "/customer");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to Pasuyo</Link>
        <div className="mt-6 grid overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="bg-emerald-700 p-8 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><UserRound className="h-6 w-6" aria-hidden="true" /></div>
            <h1 className="mt-6 text-3xl font-bold">Create your Pasuyo account</h1>
            <p className="mt-3 text-sm leading-6 text-emerald-50/90">Choose a role and join the marketplace that connects local shoppers, stores, and riders.</p>
            <div className="mt-8 space-y-3 text-sm">
              {[
                "Secure Supabase authentication",
                "Role-specific access controls",
                "Complete order and delivery tracking",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-200" aria-hidden="true" />{item}</div>
              ))}
            </div>
          </aside>
          <section className="p-6 sm:p-8">
            <div className="mb-6">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Choose your role</p>
              <h2 className="mt-2 text-2xl font-bold">Start as a {selectedRole}</h2>
            </div>
            <form action={registerAction} className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">First name<input name="first_name" required className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" /></label>
              <label className="block text-sm font-medium text-slate-700">Last name<input name="last_name" required className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" /></label>
              <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Email address<input name="email" type="email" autoComplete="email" required className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" /></label>
              <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Phone number<input name="phone_number" type="tel" autoComplete="tel" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" /></label>
              <label className="block text-sm font-medium text-slate-700">Password<input name="password" type="password" autoComplete="new-password" required className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" /></label>
              <label className="block text-sm font-medium text-slate-700">Role<select name="role" defaultValue={selectedRole} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"><option value="customer">Customer</option><option value="seller">Seller</option><option value="rider">Rider</option></select></label>
              <Button type="submit" className="sm:col-span-2">Create account</Button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-emerald-700">Sign in</Link></p>
          </section>
        </div>
      </div>
    </main>
  );
}
