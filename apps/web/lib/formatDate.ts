const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Deterministic Kenya-time formatter for SSR and hydrated client UI. */
export function formatDateTime(value: string | Date): string {
  const instant = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(instant.getTime())) return "Date unavailable";
  const kenya = new Date(instant.getTime() + 3 * 60 * 60 * 1000);
  const day = kenya.getUTCDate();
  const month = MONTHS[kenya.getUTCMonth()];
  const year = kenya.getUTCFullYear();
  const hours = kenya.getUTCHours();
  const minutes = String(kenya.getUTCMinutes()).padStart(2, "0");
  const hour12 = hours % 12 || 12;
  const meridiem = hours >= 12 ? "PM" : "AM";
  return `${day} ${month} ${year}, ${hour12}:${minutes} ${meridiem} EAT`;
}

export function formatDate(value: string | Date): string {
  return formatDateTime(value).split(",")[0] ?? "Date unavailable";
}
