import { z } from "zod";

export const roleSchema = z.enum(["customer", "seller", "rider", "admin"]);

export const profileSchema = z.object({
  first_name: z.string().min(1).max(80).trim(),
  last_name: z.string().min(1).max(80).trim(),
  phone_number: z.string().max(40).optional(),
  role: roleSchema,
});

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1).max(255).optional(),
  formatted_address: z.string().max(255).optional(),
});

export const productSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  category_id: z.string().uuid().optional(),
  price: z.number().positive().max(1_000_000),
  stock_quantity: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
  weight_unit: z.string().min(1).max(20),
  status: z.enum(["active", "inactive", "out_of_stock"]),
});

export const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive().max(999),
});

export const orderSchema = z.object({
  seller_id: z.string().uuid(),
  delivery_address: z.string().min(1).max(255),
  delivery_latitude: z.number().min(-90).max(90),
  delivery_longitude: z.number().min(-180).max(180),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.number().int().positive().max(999),
    }),
  ).min(1),
});

export const statusTransitionSchema = z.object({
  current_status: z.enum([
    "pending",
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "rider_assigned",
    "picked_up",
    "in_transit",
    "delivered",
    "cancelled",
  ]),
  next_status: z.enum([
    "pending",
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "rider_assigned",
    "picked_up",
    "in_transit",
    "delivered",
    "cancelled",
  ]),
});
