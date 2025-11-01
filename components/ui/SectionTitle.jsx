import { cn } from '../../lib/utils';

const SectionTitle = ({ 
  children, 
  className = '', 
  icon,
  description,
  ...props 
}) => {
  return (
    <div className={cn('mb-6', className)} {...props}>
      <div className="flex items-center gap-3 mb-2">
        {icon && (
          <div className="flex-shrink-0 w-6 h-6 text-primary-600 dark:text-primary-400">
            {icon}
          </div>
        )}
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {children}
        </h2>
      </div>
      {description && (
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

export { SectionTitle };
