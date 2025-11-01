import { cn } from '../../lib/utils';

const Badge = ({ 
  children, 
  className = '', 
  variant = 'neutral',
  size = 'default',
  ...props 
}) => {
  const variants = {
    live: 'bg-success-100 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400 dark:border-success-800',
    success: 'bg-success-100 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400 dark:border-success-800',
    danger: 'bg-danger-100 text-danger-700 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400 dark:border-danger-800',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    primary: 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-800',
    accent: 'bg-accent-100 text-accent-700 border-accent-200 dark:bg-accent-900/20 dark:text-accent-400 dark:border-accent-800',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    default: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium transition-colors duration-150',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export { Badge };
