export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "rider_assigned",
  "picked_up",
  "in_transit",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["rider_assigned", "cancelled"],
  rider_assigned: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "cancelled"],
  in_transit: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}

export function assertOrderStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
): void {
  if (!canTransitionOrderStatus(currentStatus, nextStatus)) {
    throw new Error(
      `Invalid order status transition from ${currentStatus} to ${nextStatus}.`,
    );
  }
}
