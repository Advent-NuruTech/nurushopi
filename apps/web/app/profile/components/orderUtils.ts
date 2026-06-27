export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    shipped: "Shipped",
    received: "Delivered",
    cancelled: "Cancelled",
  };
  return map[s] ?? s;
}

export function statusBadgeClass(s: string): string {
  switch (s) {
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "shipped":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300";
    case "received":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
}
