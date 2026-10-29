'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function addToCartAction(productId: string, quantity = 1) {
  const normalizedQuantity = Math.max(1, Math.floor(quantity));
  const supabase = await createSupabaseServerClient();
  const user = await requireRole("customer");

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, stock_quantity, status")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (productError || !product || product.stock_quantity < normalizedQuantity) {
    redirect("/customer/products");
  }

  const { data: cart } = await supabase
    .from("carts")
    .upsert({ user_id: user.id }, { onConflict: "user_id" })
    .select("id")
    .single();

  if (!cart) {
    throw new Error("Unable to create your cart.");
  }

  const { data: existingItem } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existingItem) {
    const nextQuantity = existingItem.quantity + normalizedQuantity;
    if (nextQuantity > product.stock_quantity) {
      redirect("/customer/products");
    }

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: nextQuantity, updated_at: new Date().toISOString() })
      .eq("id", existingItem.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("cart_items").insert({
      cart_id: cart.id,
      product_id: productId,
      quantity: normalizedQuantity,
    });

    if (error) throw error;
  }

  revalidatePath("/customer/cart");
  revalidatePath("/customer/products");
  revalidatePath("/customer");
}

export async function updateCartItemAction(itemId: string, quantity: number) {
  await requireRole("customer");
  const normalizedQuantity = Math.max(1, Math.floor(quantity));
  const supabase = await createSupabaseServerClient();

  const { data: item, error: itemError } = await supabase
    .from("cart_items")
    .select("id, quantity, cart_id, products!inner(stock_quantity)")
    .eq("id", itemId)
    .maybeSingle();

  const product = Array.isArray(item?.products)
    ? (item.products[0] as { stock_quantity: number } | undefined)
    : (item?.products as { stock_quantity: number } | undefined);

  if (itemError || !item || !product || product.stock_quantity < normalizedQuantity) {
    redirect("/customer/cart");
  }

  const { error } = await supabase
    .from("cart_items")
    .update({ quantity: normalizedQuantity, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("cart_id", item.cart_id);

  if (error) throw error;

  revalidatePath("/customer/cart");
}

export async function removeCartItemAction(itemId: string) {
  const user = await requireRole("customer");
  const supabase = await createSupabaseServerClient();

  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cartError) throw cartError;
  if (!cart) {
    revalidatePath("/customer/cart");
    return;
  }

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", itemId)
    .eq("cart_id", cart.id);

  if (error) throw error;

  revalidatePath("/customer/cart");
}

export async function checkoutAction() {
  await requireRole("customer");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("checkout_cart");

  if (error) {
    if (error.message.includes("delivery address")) {
      redirect("/customer/profile");
    }
    throw new Error(error.message);
  }

  revalidatePath("/customer");
  revalidatePath("/customer/products");
  revalidatePath("/customer/cart");
  revalidatePath("/customer/orders");
  redirect("/customer/orders");
}
