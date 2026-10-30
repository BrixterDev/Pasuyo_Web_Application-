import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail, AlertCircle } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { loginAction } from "@/lib/actions/auth";
import { getRoleDashboardPath } from "@/lib/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "Please enter your email and password.",
  invalid_credentials: "Incorrect email or password. Please try again.",
  profile_not_found: "Your account profile could not be found.",
  db_not_configured: "The server is not connected to the database. Please contact support.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (isSupabaseConfigured()) {
    try {
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
    } catch (err: unknown) {
      // Re-throw redirect errors so Next.js can handle them
      if (err && typeof err === "object" && "digest" in err) {
        const digest = (err as { digest: string }).digest;
        if (digest?.startsWith("NEXT_REDIRECT")) throw err;
      }
      // Otherwise continue rendering login form
    }
  }

  const errorMessage = error ? ERROR_MESSAGES[error] : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to Pasuyo</Link>
        <div className="mt-6 rounded-4xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><LockKeyhole className="h-6 w-6" aria-hidden="true" /></div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue to your Pasuyo account.</p>

          {errorMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form action={loginAction} className="mt-7 space-y-4">
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">Email address
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-500 focus-within:bg-white">
                <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <input id="email" name="email" type="email" autoComplete="email" required className="h-11 w-full bg-transparent text-sm outline-none" placeholder="you@example.com" />
              </div>
            </label>
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">Password
              <input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" placeholder="Enter your password" />
            </label>
            <div className="flex justify-end text-sm">
              <Link href="/reset-password" className="font-semibold text-emerald-700">Forgot password?</Link>
            </div>
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">New to Pasuyo? <Link href="/register?role=customer" className="font-semibold text-emerald-700">Create an account</Link></p>
        </div>
      </div>
    </main>
  );
}
