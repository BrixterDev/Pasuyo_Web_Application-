import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, title, message, type, is_read, created_at, related_order_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;

  return (
    <AppShell title="Notifications" subtitle="Stay up to date with your Pasuyo activity.">
      <section className="max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {!notifications?.length ? <p className="p-8 text-center text-sm text-slate-500">You have no notifications yet.</p> : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <article key={notification.id} className={`p-5 ${notification.is_read ? "" : "bg-emerald-50/50"}`}>
                <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{notification.title}</h2><p className="mt-1 text-sm text-slate-600">{notification.message}</p></div><time className="shrink-0 text-xs text-slate-500">{new Date(notification.created_at).toLocaleString()}</time></div>
                {notification.related_order_id ? <Link href={user.role === "customer" ? `/customer/tracking?order=${notification.related_order_id}` : user.role === "seller" ? `/seller/orders/${notification.related_order_id}/tracking` : `/rider/deliveries`} className="mt-3 inline-block text-sm font-semibold text-emerald-700">View order update</Link> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
