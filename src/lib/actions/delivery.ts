'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole, requireUser } from "@/lib/auth";
import { assertOrderStatusTransition, type OrderStatus } from "@/lib/order-status";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function saveCustomerAddressAction(formData: FormData) {
  const user = await requireRole("customer");
  const supabase = await createSupabaseServerClient();

  const address = String(formData.get("address") ?? "").trim();
  const latitudeValue = String(formData.get("latitude") ?? "").trim();
  const longitudeValue = String(formData.get("longitude") ?? "").trim();
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);

  if (
    !address
    || !latitudeValue
    || !longitudeValue
    || !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) {
    redirect("/customer/profile");
  }

  const { error } = await supabase.from("customer_addresses").upsert({
    user_id: user.id,
    address,
    latitude,
    longitude,
    formatted_address: address,
    location_timestamp: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) throw error;

  revalidatePath("/customer");
  revalidatePath("/customer/cart");
  revalidatePath("/customer/profile");
  redirect("/customer/profile");
}

export async function updateRiderAvailabilityAction(available: boolean) {
  const user = await requireRole("rider");
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("rider_profiles")
    .upsert({
      rider_id: user.id,
      availability: available ? "online" : "offline",
      updated_at: new Date().toISOString(),
    }, { onConflict: "rider_id" })
    .select("rider_id")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Could not update rider availability.");

  revalidatePath("/rider");
  revalidatePath("/rider/deliveries");
  redirect("/rider");
}

export async function acceptDeliveryAction(orderId: string) {
  const user = await requireRole("rider");
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("orders")
    .update({ status: "picked_up", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("rider_id", user.id)
    .eq("status", "rider_assigned")
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) redirect("/rider/deliveries");

  revalidatePath("/rider");
  revalidatePath("/rider/deliveries");
  revalidatePath("/customer/orders");
  revalidatePath("/customer/tracking");
  redirect("/rider/deliveries");
}

export async function updateRiderOrderStatusAction(orderId: string, nextStatus: string) {
  const user = await requireRole("rider");
  const supabase = await createSupabaseServerClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, rider_id, status")
    .eq("id", orderId)
    .eq("rider_id", user.id)
    .maybeSingle();

  if (orderError || !order) {
    redirect("/rider/deliveries");
  }

  const mappedStatus = String(nextStatus) as OrderStatus;
  try {
    assertOrderStatusTransition(order.status as OrderStatus, mappedStatus);
  } catch {
    redirect("/rider/deliveries");
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status: mappedStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("rider_id", user.id)
    .eq("status", order.status)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) redirect("/rider/deliveries");

  revalidatePath("/rider");
  revalidatePath("/rider/deliveries");
  revalidatePath("/customer/orders");
  revalidatePath("/customer/tracking");
  redirect("/rider/deliveries");
}

export async function claimDeliveryAction(orderId: string) {
  await requireRole("rider");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("claim_delivery", { p_order_id: orderId });

  if (error) throw error;

  revalidatePath("/rider");
  revalidatePath("/rider/deliveries");
  revalidatePath("/seller/orders");
  revalidatePath("/customer/orders");
  revalidatePath("/customer/tracking");
  redirect("/rider/deliveries");
}

export async function updateRiderLocationAction(orderId: string, formData: FormData) {
  const user = await requireRole("rider");
  const supabase = await createSupabaseServerClient();

  const latitude = Number(formData.get("latitude") ?? "");
  const longitude = Number(formData.get("longitude") ?? "");
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    redirect("/rider/deliveries");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("rider_id", user.id)
    .maybeSingle();

  if (orderError || !order) {
    redirect("/rider/deliveries");
  }

  const { error } = await supabase.from("rider_locations").insert({
    order_id: orderId,
    rider_id: user.id,
    latitude,
    longitude,
    accuracy: Number(formData.get("accuracy") ?? 0),
    heading: Number(formData.get("heading") ?? 0),
    speed: Number(formData.get("speed") ?? 0),
    recorded_at: new Date().toISOString(),
  });

  if (error) throw error;

  await supabase
    .from("rider_profiles")
    .update({ latitude, longitude, updated_at: new Date().toISOString() })
    .eq("rider_id", user.id);

  revalidatePath("/rider");
  revalidatePath("/customer/tracking");
}

export async function rateOrderAction(orderId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const rating = String(formData.get("rating") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  const validRating = ["1", "2", "3", "4", "5"].includes(rating);

  if (!validRating) {
    redirect(`/customer/tracking?order=${orderId}`);
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, customer_id, rider_id, status")
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .eq("status", "delivered")
    .maybeSingle();

  if (orderError || !order || !order.rider_id) {
    redirect("/customer/orders");
  }

  const { error } = await supabase.from("ratings").insert({
    order_id: orderId,
    customer_id: user.id,
    rider_id: order.rider_id,
    rating: rating as "1" | "2" | "3" | "4" | "5",
    comment: comment || null,
  });

  if (error) throw error;

  revalidatePath("/customer/orders");
  revalidatePath("/customer/tracking");
  revalidatePath("/rider");
  redirect("/customer/orders");
}
