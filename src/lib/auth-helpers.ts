import type { AppRole } from "@/lib/permissions";

export function getRoleDashboardPath(role: AppRole): string {
  switch (role) {
    case "customer":
      return "/customer";
    case "seller":
      return "/seller";
    case "rider":
      return "/rider";
    case "admin":
      return "/admin";
    default:
      return "/customer";
  }
}
