export function isSabbathClosed() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "long",
  });

  const parts = formatter.formatToParts(now);

  const day = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value);

  const isFridayAfterSix = day === "Friday" && hour >= 18;
  const isSaturdayBeforeSix = day === "Saturday" && hour < 18;

  return isFridayAfterSix || isSaturdayBeforeSix;
}
