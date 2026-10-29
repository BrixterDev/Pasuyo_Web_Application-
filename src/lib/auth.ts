import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { AppRole } from "@/lib/permissions";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: AppRole;
};

export async function requireUser(): Promise<AuthenticatedUser> {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/login");
  }

  return {
    id: user.id,
    email: profile.email,
    role: profile.role as AppRole,
  };
}

export async function requireRole(role: AppRole): Promise<AuthenticatedUser> {
  const user = await requireUser();

  if (user.role !== role) {
    redirect("/unauthorized");
  }

  return user;
}
