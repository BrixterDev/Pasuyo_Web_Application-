import { createSupabaseServerClient } from "@/lib/supabase/server";

export type QueryError = Error & { status?: number };

export async function getAuthenticatedProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, phone_number, profile_image, role")
    .eq("id", user.id)
    .maybeSingle();

  return profile;
}

export async function getPublicProductStatus(productId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, status, price, stock_quantity, name, seller_id")
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
