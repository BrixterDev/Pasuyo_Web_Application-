import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-4xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700"><ShieldAlert className="h-7 w-7" aria-hidden="true" /></div>
        <h1 className="mt-5 text-2xl font-bold">Access restricted</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Your account does not have permission to view this area. Please sign in with an authorized role.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/login"><Button>Sign in</Button></Link>
          <Link href="/"><Button variant="outline">Go home</Button></Link>
        </div>
      </div>
    </main>
  );
}
