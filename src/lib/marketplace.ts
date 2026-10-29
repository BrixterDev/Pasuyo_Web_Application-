import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MarketplaceProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  status: string;
  weight: number;
  weight_unit: string;
  seller_id: string;
  seller_name: string | null;
  seller_store_name: string | null;
  category_name: string | null;
  image_url: string | null;
};

export type CartItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    stock_quantity: number;
    status: string;
    seller_id: string;
    seller_name: string | null;
    seller_store_name: string | null;
    seller_latitude: number | null;
    seller_longitude: number | null;
    image_url: string | null;
  };
};

export type CustomerDeliveryAddress = {
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export type SellerDeliveryBreakdown = {
  sellerId: string;
  sellerStoreName: string;
  distanceKm: number | null;
  deliveryFee: number;
  isWithinMinimum: boolean;
  extraKm: number;
};

export type CartDeliveryComputation = {
  deliveryFee: number;
  sellerCount: number;
  sellers: SellerDeliveryBreakdown[];
  hasAddress: boolean;
  addressText: string | null;
};

export type CustomerOrder = {
  id: string;
  status: string;
  total_amount: number;
  subtotal: number;
  delivery_fee: number;
  created_at: string;
  delivery_address: string;
  seller_store_name: string | null;
  item_count: number;
  item_names: string;
};

export type SellerProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  status: string;
  weight: number;
  weight_unit: string;
  category_name: string | null;
  image_url: string | null;
  created_at: string;
};

export type AvailableRider = {
  rider_id: string;
  full_name: string;
  vehicle_type: string | null;
  rating: number;
};

export type DeliveryOrder = {
  id: string;
  status: string;
  total_amount: number;
  item_names: string;
  delivery_address: string;
  created_at: string;
  seller_store_name: string | null;
  customer_name: string;
  rider_name: string | null;
  rider_id: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  seller_latitude: number | null;
  seller_longitude: number | null;
  rider_latitude: number | null;
  rider_longitude: number | null;
  rider_location_updated_at: string | null;
  can_rate: boolean;
};

export type SellerAnalytics = {
  totalRevenue: number;
  completedOrders: number;
  pendingOrders: number;
  totalOrders: number;
  averageOrderValue: number;
  bestSellers: Array<{ name: string; sold: number; revenue: number }>;
  topCustomers: Array<{ name: string; orders: number; totalSpent: number }>;
};

export const RIDER_NEARBY_RADIUS_KM = 15;
const RIDER_LOCATION_MAX_AGE_MS = 5 * 60 * 1000;

export const MIN_DELIVERY_FEE = 50;
export const BASE_DELIVERY_DISTANCE_KM = 5;
export const EXTRA_KM_RATE = 20;

export function calculateDistanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const radians = (deg: number) => (deg * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  const clampedA = Math.min(1, Math.max(0, a));
  return 6371 * 2 * Math.asin(Math.sqrt(clampedA));
}

function distanceInKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  return calculateDistanceInKm(latitudeA, longitudeA, latitudeB, longitudeB);
}

export function calculateDeliveryFeeForDistance(distanceKm: number | null): number {
  if (distanceKm === null || !Number.isFinite(distanceKm)) {
    return MIN_DELIVERY_FEE;
  }
  const extraKm = Math.max(0, distanceKm - BASE_DELIVERY_DISTANCE_KM);
  return MIN_DELIVERY_FEE + Math.ceil(extraKm) * EXTRA_KM_RATE;
}

export function computeCartDeliveryFee(
  cart: CartItem[],
  customerAddress: CustomerDeliveryAddress | null,
): CartDeliveryComputation {
  const sellerMap = new Map<
    string,
    { storeName: string; lat: number | null; lng: number | null }
  >();

  for (const item of cart) {
    if (!sellerMap.has(item.product.seller_id)) {
      sellerMap.set(item.product.seller_id, {
        storeName: item.product.seller_store_name ?? "Pasuyo seller",
        lat: item.product.seller_latitude ?? null,
        lng: item.product.seller_longitude ?? null,
      });
    }
  }

  const hasCoords =
    Boolean(customerAddress?.address) &&
    customerAddress?.latitude !== null &&
    customerAddress?.latitude !== undefined &&
    customerAddress?.longitude !== null &&
    customerAddress?.longitude !== undefined;

  const sellers: SellerDeliveryBreakdown[] = [];
  let totalDeliveryFee = 0;

  for (const [sellerId, seller] of sellerMap.entries()) {
    let distanceKm: number | null = null;

    if (
      hasCoords &&
      seller.lat !== null &&
      seller.lng !== null
    ) {
      distanceKm = calculateDistanceInKm(
        seller.lat,
        seller.lng,
        customerAddress!.latitude!,
        customerAddress!.longitude!,
      );
    }

    const fee = calculateDeliveryFeeForDistance(distanceKm);
    const extraKm = distanceKm !== null ? Math.max(0, Math.ceil(distanceKm - BASE_DELIVERY_DISTANCE_KM)) : 0;
    const isWithinMinimum = distanceKm !== null ? distanceKm <= BASE_DELIVERY_DISTANCE_KM : true;

    sellers.push({
      sellerId,
      sellerStoreName: seller.storeName,
      distanceKm,
      deliveryFee: fee,
      isWithinMinimum,
      extraKm,
    });
    totalDeliveryFee += fee;
  }

  return {
    deliveryFee: totalDeliveryFee,
    sellerCount: sellerMap.size,
    sellers,
    hasAddress: Boolean(customerAddress?.address),
    addressText: customerAddress?.address ?? null,
  };
}

export async function getCustomerDeliveryAddress(userId: string): Promise<CustomerDeliveryAddress | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("address, latitude, longitude")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load customer delivery address:", error);
    return null;
  }

  return data;
}

export async function getAvailableRiders() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rider_profiles")
    .select(
      `rider_id, vehicle_type, rating,
      profiles!inner(first_name, last_name)`,
    )
    .eq("availability", "online")
    .order("rating", { ascending: false, nullsFirst: false });

  if (error) throw error;

  return (data ?? []).map((rider) => {
    const profile = Array.isArray(rider.profiles) ? rider.profiles[0] : rider.profiles;
    const fullName = profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Rider" : "Rider";

    return {
      rider_id: rider.rider_id,
      full_name: fullName,
      vehicle_type: rider.vehicle_type,
      rating: Number(rider.rating),
    } satisfies AvailableRider;
  });
}

export async function getMarketplaceProducts(search?: string) {
  const supabase = await createSupabaseServerClient();
  const term = search?.trim().toLowerCase();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, description, price, stock_quantity, status, weight, weight_unit, seller_id,
      seller_profiles!inner(seller_id, store_name,
        profiles!seller_profiles_seller_id_fkey(first_name, last_name)),
      categories(name),
      product_images(image_url, is_primary)`,
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((product) => {
      const sellerProfile = Array.isArray(product.seller_profiles) ? product.seller_profiles[0] : null;
      const profile = Array.isArray(sellerProfile?.profiles) ? sellerProfile.profiles[0] : sellerProfile?.profiles;
      const category = Array.isArray(product.categories) ? product.categories[0] : null;
      const images = Array.isArray(product.product_images) ? product.product_images : [];
      const primaryImage = images.find((image) => image.is_primary) ?? images[0];
      const fullName = profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : null;

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        stock_quantity: product.stock_quantity,
        status: product.status,
        weight: Number(product.weight),
        weight_unit: product.weight_unit,
        seller_id: product.seller_id,
        seller_name: fullName,
        seller_store_name: sellerProfile?.store_name ?? null,
        category_name: category?.name ?? null,
        image_url: primaryImage?.image_url ?? null,
      } satisfies MarketplaceProduct;
    })
    .filter((product) => {
      if (!term) return true;

      return [
        product.name,
        product.description,
        product.seller_store_name,
        product.seller_name,
        product.category_name,
      ].some((value) => value?.toLowerCase().includes(term));
    });
}

export async function getMarketplaceProduct(productId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, description, price, stock_quantity, status, weight, weight_unit, seller_id,
      seller_profiles!inner(seller_id, store_name),
      categories(name),
      product_images(image_url, is_primary)`,
    )
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const sellerProfile = Array.isArray(data.seller_profiles) ? data.seller_profiles[0] : null;
  const category = Array.isArray(data.categories) ? data.categories[0] : null;
  const images = Array.isArray(data.product_images) ? data.product_images : [];
  const primaryImage = images.find((image) => image.is_primary) ?? images[0];

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    price: Number(data.price),
    stock_quantity: data.stock_quantity,
    status: data.status,
    weight: Number(data.weight),
    weight_unit: data.weight_unit,
    seller_id: data.seller_id,
    seller_name: null,
    seller_store_name: sellerProfile?.store_name ?? null,
    category_name: category?.name ?? null,
    image_url: primaryImage?.image_url ?? null,
  } satisfies MarketplaceProduct;
}

export async function getCustomerCart(userId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (cartError) throw cartError;
  if (!cart) return [];

  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `id, quantity,
      products!inner(id, name, price, stock_quantity, status, seller_id,
        seller_profiles!inner(seller_id, store_name, latitude, longitude),
        product_images(image_url, is_primary))`,
    )
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const mappedItems = (data ?? []).map((item) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    if (!product) {
      return null;
    }

    const sellerProfile = Array.isArray(product.seller_profiles) ? product.seller_profiles[0] : null;
    const images = Array.isArray(product.product_images) ? product.product_images : [];
    const primaryImage = images.find((image) => image.is_primary) ?? images[0];

    return {
      id: item.id,
      quantity: item.quantity,
      product: {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        stock_quantity: product.stock_quantity,
        status: product.status,
        seller_id: product.seller_id,
        seller_name: null,
        seller_store_name: sellerProfile?.store_name ?? null,
        seller_latitude: sellerProfile?.latitude ?? null,
        seller_longitude: sellerProfile?.longitude ?? null,
        image_url: primaryImage?.image_url ?? null,
      },
    } satisfies CartItem;
  });

  return mappedItems.filter((item) => item !== null) as CartItem[];
}

export async function getCustomerOrders(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, status, subtotal, delivery_fee, total_amount, created_at, delivery_address,
      seller_profiles!inner(store_name),
      order_items(quantity, product_name_snapshot)`,
    )
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((order) => {
    const sellerProfile = Array.isArray(order.seller_profiles) ? order.seller_profiles[0] : null;
    const items = Array.isArray(order.order_items) ? order.order_items : [];

    return {
      id: order.id,
      status: order.status,
      total_amount: Number(order.total_amount),
      subtotal: Number(order.subtotal),
      delivery_fee: Number(order.delivery_fee),
      created_at: order.created_at,
      delivery_address: order.delivery_address,
      seller_store_name: sellerProfile?.store_name ?? null,
      item_count: items.reduce((sum, item) => sum + item.quantity, 0),
      item_names: items.map((item) => item.product_name_snapshot).join(", "),
    } satisfies CustomerOrder;
  });
}

export async function getSellerProducts(sellerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, description, price, stock_quantity, status, weight, weight_unit, created_at,
      categories(name),
      product_images(image_url, is_primary)`,
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((product) => {
    const category = Array.isArray(product.categories) ? product.categories[0] : null;
    const images = Array.isArray(product.product_images) ? product.product_images : [];
    const primaryImage = images.find((image) => image.is_primary) ?? images[0];

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      stock_quantity: product.stock_quantity,
      status: product.status,
      weight: Number(product.weight),
      weight_unit: product.weight_unit,
      category_name: category?.name ?? null,
      image_url: primaryImage?.image_url ?? null,
      created_at: product.created_at,
    } satisfies SellerProduct;
  });
}

export async function getSellerOrders(sellerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, status, subtotal, delivery_fee, total_amount, created_at, delivery_address,
      profiles!orders_customer_id_fkey(first_name, last_name),
      order_items(quantity, product_name_snapshot)`,
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((order) => {
    const customer = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const customerName = customer ? `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || "Customer" : "Customer";

    return {
      id: order.id,
      status: order.status,
      subtotal: Number(order.subtotal),
      total_amount: Number(order.total_amount),
      created_at: order.created_at,
      delivery_address: order.delivery_address,
      customer_name: customerName,
      item_names: items.map((item) => item.product_name_snapshot).join(", "),
      item_count: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  });
}

export async function getSellerMetrics(sellerId: string): Promise<SellerAnalytics> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, subtotal, total_amount, status, created_at, customer_id, seller_profiles!inner(store_name), profiles!orders_customer_id_fkey(first_name, last_name), order_items(quantity, product_name_snapshot, unit_price_snapshot)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const orders = data ?? [];
  const normalisedOrders = orders.map((order) => ({
    ...order,
    subtotal: Number(order.subtotal),
    total_amount: Number(order.total_amount),
    item_names: Array.isArray(order.order_items) ? order.order_items.map((item) => item.product_name_snapshot).join(", ") : "",
  }));
  const completedOrders = normalisedOrders.filter((order) => order.status === "delivered").length;
  const totalRevenue = normalisedOrders
    .filter((order) => order.status === "delivered")
    .reduce((sum, order) => sum + order.subtotal, 0);
  const pendingOrders = normalisedOrders.filter((order) => order.status !== "delivered" && order.status !== "cancelled").length;
  const averageOrderValue = completedOrders ? totalRevenue / completedOrders : 0;

  const productTotals = new Map<string, { sold: number; revenue: number }>();
  for (const order of normalisedOrders) {
    if (order.status !== "delivered") continue;
    for (const item of Array.isArray(order.order_items) ? order.order_items : []) {
      const key = String(item.product_name_snapshot);
      const current = productTotals.get(key) ?? { sold: 0, revenue: 0 };
      current.sold += Number(item.quantity);
      current.revenue += Number(item.quantity) * Number(item.unit_price_snapshot ?? 0);
      productTotals.set(key, current);
    }
  }

  const topCustomers = new Map<string, { name: string; orders: number; totalSpent: number }>();
  for (const order of normalisedOrders.filter((entry) => entry.status === "delivered")) {
    const customer = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
    const name = customer ? `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || "Customer" : "Customer";
    const current = topCustomers.get(order.customer_id) ?? { name, orders: 0, totalSpent: 0 };
    current.orders += 1;
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    current.totalSpent += items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price_snapshot), 0);
    topCustomers.set(order.customer_id, current);
  }

  return {
    totalRevenue,
    completedOrders,
    pendingOrders,
    totalOrders: normalisedOrders.length,
    averageOrderValue,
    bestSellers: [...productTotals.entries()]
      .map(([name, values]) => ({ name, sold: values.sold, revenue: values.revenue }))
      .sort((a, b) => b.sold - a.sold || b.revenue - a.revenue)
      .slice(0, 5),
    topCustomers: [...topCustomers.values()]
      .sort((a, b) => b.orders - a.orders || b.totalSpent - a.totalSpent)
      .slice(0, 5),
  };
}

export async function getCustomerTrackingOrder(orderId: string, customerId: string): Promise<DeliveryOrder | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`id, status, total_amount, delivery_address, created_at, delivery_latitude, delivery_longitude,
      seller_profiles!inner(store_name, address, latitude, longitude),
      profiles!orders_customer_id_fkey(first_name, last_name),
      rider_profiles!orders_rider_id_fkey(rider_id, availability, latitude, longitude, profiles!inner(first_name, last_name)),
      order_items(quantity, product_name_snapshot)`)
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const sellerProfile = Array.isArray(data.seller_profiles) ? data.seller_profiles[0] : data.seller_profiles;
  const riderProfile = Array.isArray(data.rider_profiles) ? data.rider_profiles[0] : data.rider_profiles;
  const driverProfile = riderProfile?.profiles
    ? (Array.isArray(riderProfile.profiles) ? riderProfile.profiles[0] : riderProfile.profiles)
    : null;
  const customer = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const items = Array.isArray(data.order_items) ? data.order_items : [];
  let latestRiderLocation: { latitude: number; longitude: number; recorded_at: string } | null = null;

  if (riderProfile?.rider_id) {
    const { data: location, error: locationError } = await supabase
      .from("rider_locations")
      .select("latitude, longitude, recorded_at")
      .eq("order_id", data.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (locationError) throw locationError;
    if (location) {
      latestRiderLocation = {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        recorded_at: location.recorded_at,
      };
    }
  }

  const canRate = data.status === "delivered" && !await hasRatedOrder(customerId, data.id);

  return {
    id: data.id,
    status: data.status,
    total_amount: Number(data.total_amount),
    item_names: items.map((item) => item.product_name_snapshot).join(", "),
    delivery_address: data.delivery_address,
    created_at: data.created_at,
    seller_store_name: sellerProfile?.store_name ?? null,
    customer_name: customer ? `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || "Customer" : "Customer",
    rider_name: driverProfile ? `${driverProfile.first_name ?? ""} ${driverProfile.last_name ?? ""}`.trim() || "Rider" : null,
    rider_id: riderProfile?.rider_id ?? null,
    delivery_latitude: data.delivery_latitude,
    delivery_longitude: data.delivery_longitude,
    seller_latitude: sellerProfile?.latitude ?? null,
    seller_longitude: sellerProfile?.longitude ?? null,
    rider_latitude: latestRiderLocation?.latitude ?? null,
    rider_longitude: latestRiderLocation?.longitude ?? null,
    rider_location_updated_at: latestRiderLocation?.recorded_at ?? null,
    can_rate: canRate,
  };
}

export async function getSellerTrackingOrder(orderId: string, sellerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`id, status, subtotal, delivery_fee, total_amount, delivery_address, created_at, delivery_latitude, delivery_longitude,
      profiles!orders_customer_id_fkey(first_name, last_name, email),
      seller_profiles!inner(store_name, latitude, longitude),
      rider_profiles!orders_rider_id_fkey(rider_id, availability),
      order_items(quantity, product_name_snapshot, unit_price_snapshot, subtotal)`)
    .eq("id", orderId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const sellerProfile = Array.isArray(data.seller_profiles) ? data.seller_profiles[0] : data.seller_profiles;
  const customerProfile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const riderProfile = Array.isArray(data.rider_profiles) ? data.rider_profiles[0] : data.rider_profiles;
  let riderLocation: { latitude: number; longitude: number; recorded_at: string } | null = null;

  if (riderProfile?.rider_id) {
    const { data: location, error: locationError } = await supabase
      .from("rider_locations")
      .select("latitude, longitude, recorded_at")
      .eq("order_id", data.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (locationError) throw locationError;
    if (location) riderLocation = {
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      recorded_at: location.recorded_at,
    };
  }

  return {
    id: data.id,
    status: data.status,
    subtotal: Number(data.subtotal),
    delivery_fee: Number(data.delivery_fee),
    total_amount: Number(data.total_amount),
    customer_name: customerProfile ? `${customerProfile.first_name ?? ""} ${customerProfile.last_name ?? ""}`.trim() || "Customer" : "Customer",
    delivery_address: data.delivery_address,
    created_at: data.created_at,
    seller_store_name: sellerProfile?.store_name ?? "Seller",
    seller_latitude: sellerProfile?.latitude ?? null,
    seller_longitude: sellerProfile?.longitude ?? null,
    delivery_latitude: data.delivery_latitude,
    delivery_longitude: data.delivery_longitude,
    rider_id: riderProfile?.rider_id ?? null,
    rider_name: riderProfile?.rider_id ? "Assigned rider" : null,
    rider_latitude: riderLocation?.latitude ?? null,
    rider_longitude: riderLocation?.longitude ?? null,
    rider_location_updated_at: riderLocation?.recorded_at ?? null,
    items: (Array.isArray(data.order_items) ? data.order_items : []).map((item) => ({
      name: item.product_name_snapshot,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price_snapshot),
      subtotal: Number(item.subtotal),
    })),
  };
}

export async function getRiderDeliveries(riderId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: riderProfile, error: riderError } = await supabase
    .from("rider_profiles")
    .select("availability, latitude, longitude, location_updated_at")
    .eq("rider_id", riderId)
    .maybeSingle();

  if (riderError) throw riderError;

  const isOnline = riderProfile?.availability === "online";
  const locationAge = riderProfile?.location_updated_at ? Date.now() - Date.parse(riderProfile.location_updated_at) : Infinity;
  const locationIsFresh = locationAge >= -30000 && locationAge <= RIDER_LOCATION_MAX_AGE_MS;
  const riderLatitude = locationIsFresh && riderProfile?.latitude !== null && riderProfile?.latitude !== undefined ? Number(riderProfile.latitude) : null;
  const riderLongitude = locationIsFresh && riderProfile?.longitude !== null && riderProfile?.longitude !== undefined ? Number(riderProfile.longitude) : null;

  const { data, error } = await supabase
    .from("orders")
    .select(`id, status, rider_id, total_amount, delivery_fee, delivery_address, delivery_latitude, delivery_longitude, created_at,
      seller_profiles!inner(store_name, address, latitude, longitude),
      profiles!orders_customer_id_fkey(first_name, last_name),
      order_items(quantity, product_name_snapshot)`)
    .or(`rider_id.eq.${riderId},and(rider_id.is.null,status.eq.ready_for_pickup)`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const mappedOrders = (data ?? []).map((order) => {
    const sellerProfile = Array.isArray(order.seller_profiles) ? order.seller_profiles[0] : order.seller_profiles;
    const customer = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const hasSellerCoordinates = sellerProfile?.latitude !== null && sellerProfile?.latitude !== undefined
      && sellerProfile.longitude !== null && sellerProfile.longitude !== undefined;
    const pickupLatitude = hasSellerCoordinates ? Number(sellerProfile.latitude) : null;
    const pickupLongitude = hasSellerCoordinates ? Number(sellerProfile.longitude) : null;
    const pickupDistanceKm = riderLatitude !== null && riderLongitude !== null
      && pickupLatitude !== null && pickupLongitude !== null
      ? distanceInKm(riderLatitude, riderLongitude, Number(pickupLatitude), Number(pickupLongitude))
      : null;

    return {
      id: order.id,
      status: order.status,
      rider_id: order.rider_id,
      total_amount: Number(order.total_amount),
      delivery_fee: Number(order.delivery_fee),
      delivery_address: order.delivery_address,
      created_at: order.created_at,
      seller_store_name: sellerProfile?.store_name ?? null,
      seller_address: sellerProfile?.address ?? null,
      customer_name: customer ? `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || "Customer" : "Customer",
      delivery_latitude: order.delivery_latitude,
      delivery_longitude: order.delivery_longitude,
      seller_latitude: sellerProfile?.latitude ?? null,
      seller_longitude: sellerProfile?.longitude ?? null,
      rider_latitude: riderLatitude,
      rider_longitude: riderLongitude,
      rider_location_updated_at: riderProfile?.location_updated_at ?? null,
      pickup_location_label: sellerProfile?.store_name ?? "Seller pickup",
      pickup_distance_km: pickupDistanceKm,
      item_names: items.map((item) => item.product_name_snapshot).join(", "),
    };
  });

  return mappedOrders
    .filter((order) => !["delivered", "cancelled"].includes(order.status) && (
      order.rider_id === riderId || (
        order.status === "ready_for_pickup"
        && order.rider_id === null
      )
    ))
    .sort((left, right) => {
      const leftAvailable = left.status === "ready_for_pickup" && left.rider_id === null;
      const rightAvailable = right.status === "ready_for_pickup" && right.rider_id === null;
      if (leftAvailable !== rightAvailable) return leftAvailable ? -1 : 1;
      if (leftAvailable && rightAvailable) return (left.pickup_distance_km ?? Infinity) - (right.pickup_distance_km ?? Infinity);
      return Date.parse(right.created_at) - Date.parse(left.created_at);
    });
}

export async function getSellerPickupLocation(sellerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("seller_profiles")
    .select("address, latitude, longitude")
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (error) throw error;
  return {
    address: data?.address ?? "",
    latitude: data?.latitude ?? null,
    longitude: data?.longitude ?? null,
  };
}

export async function getRiderCompletedDeliveries(riderId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`id, status, total_amount, delivery_fee, delivery_address, created_at, updated_at,
      seller_profiles!inner(store_name),
      order_items(quantity, product_name_snapshot)`)
    .eq("rider_id", riderId)
    .eq("status", "delivered")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  return (data ?? []).map((order) => {
    const sellerProfile = Array.isArray(order.seller_profiles) ? order.seller_profiles[0] : order.seller_profiles;
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    return {
      id: order.id,
      total_amount: Number(order.total_amount),
      delivery_fee: Number(order.delivery_fee),
      delivery_address: order.delivery_address,
      completed_at: order.updated_at,
      seller_store_name: sellerProfile?.store_name ?? "Seller",
      item_names: items.map((item) => item.product_name_snapshot).join(", "),
    };
  });
}

export async function getRiderAvailability(riderId: string): Promise<"online" | "offline"> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rider_profiles")
    .select("availability")
    .eq("rider_id", riderId)
    .maybeSingle();

  if (error) throw error;
  return data?.availability === "online" ? "online" : "offline";
}

export async function getRiderAnalytics(riderId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("status, delivery_fee, total_amount, created_at, rider_id")
    .eq("rider_id", riderId);

  if (error) throw error;

  const completed = (data ?? []).filter((order) => order.status === "delivered");
  const revenue = completed.reduce((sum, order) => sum + Number(order.delivery_fee), 0);
  const average = completed.length ? revenue / completed.length : 0;

  return {
    completedDeliveries: completed.length,
    totalRevenue: revenue,
    averageOrderValue: average,
    activeDeliveries: (data ?? []).filter((order) => !["delivered", "cancelled"].includes(order.status)).length,
  };
}

export async function getRiderRatings(riderId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ratings")
    .select("id, rating, comment, created_at, order_id")
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((review) => ({
    id: review.id,
    rating: Number(review.rating),
    comment: review.comment,
    created_at: review.created_at,
    order_id: review.order_id,
  }));
}

async function hasRatedOrder(customerId: string, orderId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ratings")
    .select("id")
    .eq("order_id", orderId)
    .eq("customer_id", customerId)
    .maybeSingle();

  return Boolean(!error && data);
}
