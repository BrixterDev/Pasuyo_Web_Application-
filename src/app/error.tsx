"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  const isServerRenderError = error.message?.includes("441");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <AlertCircle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {isServerRenderError ? "Database Connection Required" : "Something went wrong"}
      </h2>
      <p className="mt-2 max-w-lg text-sm text-slate-600">
        {isServerRenderError
          ? "The server could not connect to Supabase. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured in your Vercel Project Environment Variables, then redeploy."
          : error.message || "An unexpected error occurred while loading this page."}
      </p>
      {error.digest ? (
        <p className="mt-1 text-xs text-slate-400">Digest: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </Button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
