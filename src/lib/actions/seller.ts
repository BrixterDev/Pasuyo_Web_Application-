'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { assertOrderStatusTransition, type OrderStatus } from "@/lib/order-status";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_PRODUCT_IMAGES = 5;
const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_PRODUCT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function getProductImages(formData: FormData) {
  const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length > MAX_PRODUCT_IMAGES) {
    throw new Error(`You can upload a maximum of ${MAX_PRODUCT_IMAGES} product images.`);
  }

  for (const file of files) {
    if (!ALLOWED_PRODUCT_IMAGE_TYPES.has(file.type) || file.size > MAX_PRODUCT_IMAGE_SIZE) {
      throw new Error("Product images must be JPEG, PNG, WebP, or GIF files no larger than 5 MB.");
    }
  }

  return files;
}

async function uploadProductImages(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  sellerId: string,
  productId: string,
  files: File[],
) {
  const imageRows: Array<{ product_id: string; image_url: string; is_primary: boolean }> = [];

  for (const [index, file] of files.entries()) {
    const extension = file.type.split("/")[1] ?? "jpg";
    const path = `${sellerId}/${productId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
    imageRows.push({ product_id: productId, image_url: data.publicUrl, is_primary: index === 0 });
  }

  if (imageRows.length > 0) {
    const { error } = await supabase.from("product_images").insert(imageRows);
    if (error) throw error;
  }
}

function slugifyCategory(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function resolveCategoryId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, categoryName: string | null) {
  const normalizedName = categoryName?.trim();
  if (!normalizedName) {
    return null;
  }

  const slug = slugifyCategory(normalizedName) || "general";
  const { data: existingCategory, error: lookupError } = await supabase
    .from("categories")
    .select("id")
    .eq("name", normalizedName)
    .maybeSingle();

  if (lookupError?.code === "42501") return null;
  if (lookupError) throw lookupError;
  if (existingCategory) return existingCategory.id;

  const { data: category, error } = await supabase
    .from("categories")
    .insert({ name: normalizedName, slug })
    .select("id")
    .single();

  if (!error && category) return category.id;

  if (error?.code === "23505") {
    const { data: matchingCategory, error: matchingError } = await supabase
      .from("categories")
      .select("id")
      .eq("name", normalizedName)
      .maybeSingle();

    if (matchingError) throw matchingError;
    if (matchingCategory) return matchingCategory.id;
  }

  if (error?.code === "42501") return null;

  throw error ?? new Error("Unable to resolve the product category.");
}

export async function createSellerProductAction(formData: FormData) {
  const user = await requireRole("seller");
  const supabase = await createSupabaseServerClient();
  const imageFiles = getProductImages(formData);

  const categoryName = String(formData.get("category_name") ?? "").trim();
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    price: Number(String(formData.get("price") ?? "0")),
    stock_quantity: Number(String(formData.get("stock_quantity") ?? "0")),
    weight: Number(String(formData.get("weight") ?? "0")),
    weight_unit: String(formData.get("weight_unit") ?? "kg").trim() || "kg",
    status: String(formData.get("status") ?? "active") as "active" | "inactive" | "out_of_stock",
  };

  if (!payload.name || !Number.isFinite(payload.price) || !Number.isFinite(payload.stock_quantity) || !Number.isFinite(payload.weight)) {
    redirect("/seller");
  }

  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("seller_id, store_name")
    .eq("seller_id", user.id)
    .maybeSingle();

  if (!sellerProfile) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    const { error: sellerProfileError } = await supabase
      .from("seller_profiles")
      .upsert(
        {
          seller_id: user.id,
          store_name: `${profile?.first_name ?? "Pasuyo"} ${profile?.last_name ?? "Seller"}`.trim() || "Pasuyo Seller",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "seller_id" },
      );

    if (sellerProfileError) throw sellerProfileError;
  }

  const categoryId = await resolveCategoryId(supabase, categoryName);

  const { data: product, error } = await supabase.from("products").insert({
    seller_id: user.id,
    category_id: categoryId,
    ...payload,
  }).select("id").single();

  if (error || !product) throw error ?? new Error("Unable to create the product.");

  await uploadProductImages(supabase, user.id, product.id, imageFiles);

  revalidatePath("/seller");
  revalidatePath("/seller/orders");
  revalidatePath("/customer");
  revalidatePath("/customer/products");
  redirect("/seller");
}

export async function updateSellerProductAction(productId: string, formData: FormData) {
  const user = await requireRole("seller");
  const supabase = await createSupabaseServerClient();
  const imageFiles = getProductImages(formData);

  const categoryName = String(formData.get("category_name") ?? "").trim();
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    price: Number(String(formData.get("price") ?? "0")),
    stock_quantity: Number(String(formData.get("stock_quantity") ?? "0")),
    weight: Number(String(formData.get("weight") ?? "0")),
    weight_unit: String(formData.get("weight_unit") ?? "kg").trim() || "kg",
    status: String(formData.get("status") ?? "active") as "active" | "inactive" | "out_of_stock",
  };

  if (!payload.name || !Number.isFinite(payload.price) || !Number.isFinite(payload.stock_quantity) || !Number.isFinite(payload.weight)) {
    redirect("/seller");
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, seller_id")
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product || product.seller_id !== user.id) {
    redirect("/seller");
  }

  const categoryId = await resolveCategoryId(supabase, categoryName);

  const { error } = await supabase
    .from("products")
    .update({
      ...payload,
      category_id: categoryId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("seller_id", user.id);

  if (error) throw error;

  await uploadProductImages(supabase, user.id, productId, imageFiles);

  revalidatePath("/seller");
  revalidatePath("/customer/products");
  redirect("/seller");
}

export async function saveSellerLocationAction(formData: FormData) {
  const user = await requireRole("seller");
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
    || latitude < -90
    || latitude > 90
    || !Number.isFinite(longitude)
    || longitude < -180
    || longitude > 180
  ) {
    redirect("/seller");
  }

  const { data: sellerProfile, error: lookupError } = await supabase
    .from("seller_profiles")
    .select("store_name")
    .eq("seller_id", user.id)
    .maybeSingle();

  if (lookupError) throw lookupError;

  const { error } = await supabase.from("seller_profiles").upsert({
    seller_id: user.id,
    store_name: sellerProfile?.store_name ?? "Pasuyo Store",
    address,
    latitude,
    longitude,
    updated_at: new Date().toISOString(),
  }, { onConflict: "seller_id" });

  if (error) throw error;

  revalidatePath("/seller");
  revalidatePath("/seller/orders");
  revalidatePath("/rider/deliveries");
  revalidatePath("/customer/tracking");
  redirect("/seller");
}

export async function updateSellerOrderStatusAction(orderId: string, nextStatus: string) {
  const user = await requireRole("seller");
  const supabase = await createSupabaseServerClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, seller_id, status")
    .eq("id", orderId)
    .eq("seller_id", user.id)
    .maybeSingle();

  if (orderError || !order) {
    redirect("/seller/orders");
  }

  const currentStatus = order.status as OrderStatus;
  const mappedStatus = String(nextStatus) as OrderStatus;

  try {
    assertOrderStatusTransition(currentStatus, mappedStatus);
  } catch {
    redirect("/seller/orders");
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: mappedStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("seller_id", user.id);

  if (error) throw error;

  revalidatePath("/seller/orders");
  revalidatePath("/seller");
  redirect("/seller/orders");
}

export async function assignSellerOrderRiderAction(orderId: string, formData: FormData) {
  const user = await requireRole("seller");
  const supabase = await createSupabaseServerClient();
  const riderId = String(formData.get("rider_id") ?? "").trim();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, seller_id, status, rider_id")
    .eq("id", orderId)
    .eq("seller_id", user.id)
    .maybeSingle();

  if (orderError || !order) {
    redirect("/seller/orders");
  }

  if (order.status !== "ready_for_pickup") {
    redirect("/seller/orders");
  }

  const { data: rider, error: riderError } = await supabase
    .from("rider_profiles")
    .select("rider_id, availability")
    .eq("rider_id", riderId)
    .maybeSingle();

  if (riderError || !rider || rider.availability !== "online") {
    redirect("/seller/orders");
  }

  const { error } = await supabase
    .from("orders")
    .update({
      rider_id: riderId,
      status: "rider_assigned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("seller_id", user.id);

  if (error) throw error;

  revalidatePath("/seller/orders");
  revalidatePath("/seller");
  redirect("/seller/orders");
}
