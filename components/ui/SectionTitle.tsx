import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SectionTitle({
  title,
  description,
  icon,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start gap-3", className)}>
      {icon && <div className="mt-1 text-indigo-500">{icon}</div>}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        )}
      </div>
    </div>
  );
}
