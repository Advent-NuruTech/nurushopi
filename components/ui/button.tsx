"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  className,
  variant = "default",
  size = "md",
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        [
          variant === "default" && "bg-sky-600 text-white hover:bg-sky-700",
          variant === "outline" &&
            "border border-sky-600 text-sky-600 hover:bg-sky-50 dark:hover:bg-gray-800",
          variant === "ghost" &&
            "text-sky-600 hover:bg-sky-50 dark:hover:bg-gray-800",
          variant === "destructive" &&
            "bg-rose-600 text-white hover:bg-rose-700",

          size === "sm" && "h-8 px-3 text-sm",
          size === "md" && "h-10 px-4 text-base",
          size === "lg" && "h-12 px-6 text-lg",

          className,
        ]
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
