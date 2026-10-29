import { AppShell } from "@/components/app-shell";
import { CustomerDeliveryLocationForm } from "@/components/customer-delivery-location-form";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CustomerProfilePage() {
  const user = await requireRole("customer");
  const supabase = await createSupabaseServerClient();
  const { data: address } = await supabase
    .from("customer_addresses")
    .select("address, latitude, longitude")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <AppShell title="My profile" subtitle="Choose the address and map pin where you want your orders delivered.">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Desired delivery address</h2>
        <p className="mt-1 text-sm text-slate-500">This address and map pin will be used as the drop-off location during checkout.</p>
        <CustomerDeliveryLocationForm
          initialAddress={address?.address ?? ""}
          initialLatitude={address?.latitude ?? null}
          initialLongitude={address?.longitude ?? null}
        />
      </section>
    </AppShell>
  );
}
