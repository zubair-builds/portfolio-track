import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "default" | "lg" | "md"; // Added md for backward compatibility if needed, though default is standard

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = "primary",
  size = "default",
  disabled = false,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
    outline: "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 focus:ring-slate-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800",
    ghost: "text-slate-700 hover:bg-slate-100 focus:ring-slate-500 dark:text-slate-300 dark:hover:bg-slate-800",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    default: "px-4 py-2 text-sm",
    md: "px-4 py-2 text-sm", // Alias for default
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    />
  );
}
