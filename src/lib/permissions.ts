export type AppRole = "customer" | "seller" | "rider" | "admin";

export function canManageRole(actorRole: AppRole, targetRole: AppRole): boolean {
  return actorRole === "admin" && targetRole !== "admin";
}

export function canAccessCustomerData(
  actorRole: AppRole,
  customerId: string,
  targetCustomerId: string,
): boolean {
  return actorRole === "customer" && customerId === targetCustomerId;
}

export function canAccessSellerData(
  actorRole: AppRole,
  sellerId: string,
  targetSellerId: string,
): boolean {
  return actorRole === "seller" && sellerId === targetSellerId;
}

export function canAccessRiderData(
  actorRole: AppRole,
  riderId: string,
  targetRiderId: string,
): boolean {
  return actorRole === "rider" && riderId === targetRiderId;
}
