import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <AppShell title="Settings" subtitle="Review your account settings.">
      <section className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Account settings</h2>
        <p className="mt-1 text-sm text-slate-500">You are signed in as {user.email}.</p>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          Password and notification settings will be available here soon.
        </div>
      </section>
    </AppShell>
  );
}
