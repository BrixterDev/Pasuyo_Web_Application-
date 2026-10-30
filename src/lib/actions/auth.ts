'use server';

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { AppRole } from "@/lib/permissions";
import { getRoleDashboardPath } from "@/lib/auth-helpers";

const normalizeRole = (role: FormDataEntryValue | null | undefined): AppRole => {
  const value = String(role ?? "customer").toLowerCase();
  return value === "seller" || value === "rider" || value === "admin" ? value : "customer";
};

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing_fields");
  }

  if (!isSupabaseConfigured()) {
    redirect("/login?error=db_not_configured");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect("/login?error=invalid_credentials");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/login?error=profile_not_found");
  }

  redirect(getRoleDashboardPath(profile.role as AppRole));
}

export async function registerAction(formData: FormData) {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phoneNumber = String(formData.get("phone_number") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = normalizeRole(formData.get("role"));

  if (!firstName || !lastName || !email || !password) {
    redirect("/register?role=" + role);
  }

  if (!isSupabaseConfigured()) {
    redirect("/register?role=" + role + "&error=db_not_configured");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        role,
      },
    },
  });

  if (error || !data.user) {
    redirect("/register?role=" + role);
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: data.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    phone_number: phoneNumber || null,
    role,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    redirect("/register?role=" + role);
  }

  if (role === "seller") {
    const { error: sellerProfileError } = await supabase.from("seller_profiles").upsert({
      seller_id: data.user.id,
      store_name: `${firstName} ${lastName}`.trim() || "Pasuyo Store",
      updated_at: new Date().toISOString(),
    }, { onConflict: "seller_id" });

    if (sellerProfileError) {
      redirect("/register?role=" + role);
    }
  }

  if (role === "rider") {
    const { error: riderProfileError } = await supabase.from("rider_profiles").upsert({
      rider_id: data.user.id,
      availability: "offline",
    }, { onConflict: "rider_id" });

    if (riderProfileError) {
      redirect("/register?role=" + role);
    }
  }

  redirect(getRoleDashboardPath(role));
}

export async function logoutAction() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
