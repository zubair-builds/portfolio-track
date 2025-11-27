import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "live" | "success" | "danger" | "neutral" | "secondary";

const styles: Record<Variant, string> = {
  live: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20",
  success: "bg-green-100 text-green-700 ring-1 ring-green-600/20",
  danger: "bg-rose-100 text-rose-700 ring-1 ring-rose-600/20",
  neutral: "bg-slate-100 text-slate-700 ring-1 ring-slate-600/20",
  secondary: "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-600/20 dark:bg-indigo-900/30 dark:text-indigo-300",
};

export function Badge({
  className,
  variant = "neutral",
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
