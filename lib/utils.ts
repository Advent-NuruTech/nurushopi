import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Smart className combiner for Tailwind + TypeScript
 * - Accepts strings, arrays, objects, nulls, booleans
 * - Type-safe (no TS errors)
 * - Merges Tailwind classes intelligently (avoids duplicates)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
