-- ==============================================================================
-- Pasuyo Database Cleanup Script
-- Purpose: Delete all user accounts and user-generated data while preserving
--          all database tables, functions, triggers, policies, and storage buckets.
-- ==============================================================================

-- 1. Truncate all public application tables (cascades automatically through all foreign keys)
TRUNCATE TABLE
  public.notifications,
  public.ratings,
  public.order_status_history,
  public.rider_locations,
  public.order_items,
  public.orders,
  public.cart_items,
  public.carts,
  public.favorites,
  public.search_history,
  public.product_images,
  public.products,
  public.categories,
  public.customer_addresses,
  public.seller_profiles,
  public.rider_profiles,
  public.profiles
CASCADE;

-- 2. Remove all registered users from Supabase Auth
DELETE FROM auth.users;

-- 3. Remove all uploaded product images from the storage bucket
DELETE FROM storage.objects WHERE bucket_id = 'product-images';
