import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getRiderRatings } from "@/lib/marketplace";

export default async function ProfilePage() {
  const user = await requireUser();
  const name = user.email.split("@")[0];
  const ratings = user.role === "rider" ? await getRiderRatings(user.id) : [];
  const averageRating = ratings.length ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length : 0;

  return (
    <AppShell title="Profile" subtitle="Manage your Pasuyo account profile.">
      <section className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-black uppercase text-emerald-700">{name.slice(0, 1)}</div>
          <div>
            <h2 className="text-xl font-bold">{name}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account type</dt><dd className="mt-1 capitalize font-semibold">{user.role}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt><dd className="mt-1 font-semibold">{user.email}</dd></div>
        </dl>
      </section>
      {user.role === "rider" ? (
        <section className="mt-5 max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Customer ratings</h2>
              <p className="mt-1 text-sm text-slate-500">Feedback from customers you delivered to.</p>
            </div>
            <div className="text-right"><p className="text-2xl font-black text-amber-500">{averageRating ? averageRating.toFixed(1) : "—"} ★</p><p className="text-xs text-slate-500">{ratings.length} rating{ratings.length === 1 ? "" : "s"}</p></div>
          </div>
          {ratings.length ? (
            <div className="mt-5 space-y-3">
              {ratings.map((review) => <article key={review.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between"><span className="font-bold text-amber-500">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><time className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()}</time></div><p className="mt-2 text-sm text-slate-700">{review.comment || "No written comment."}</p></article>)}
            </div>
          ) : <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No customer ratings yet.</p>}
        </section>
      ) : null}
    </AppShell>
  );
}
