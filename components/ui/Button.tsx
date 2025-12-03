import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50";

  let sizeStyles = "";
  switch (size) {
    case "sm":
      sizeStyles = "px-3 py-1.5 text-xs";
      break;
    case "md":
      sizeStyles = "px-4 py-2 text-sm";
      break;
    case "lg":
      sizeStyles = "px-6 py-3 text-base";
      break;
  }

  let variantStyles = "";
  switch (variant) {
    case "primary":
      variantStyles = "bg-indigo-600 text-white hover:bg-indigo-700";
      break;
    case "secondary":
      variantStyles = "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800";
      break;
    case "ghost":
      variantStyles = "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300";
      break;
    case "outline":
      variantStyles = "border border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300";
      break;
  }

  return <button className={cn(base, sizeStyles, variantStyles, className)} {...props} />;
}
