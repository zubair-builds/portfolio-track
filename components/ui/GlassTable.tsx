import React from 'react';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    children: React.ReactNode;
}

export function Table({ children, className = '', ...props }: TableProps) {
    return (
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <table className={`w-full text-sm text-left ${className}`} {...props}>
                {children}
            </table>
        </div>
    );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
    return (
        <thead className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm text-xs uppercase tracking-wider">
            {children}
        </thead>
    );
}

export function TableBody({ children }: { children: React.ReactNode }) {
    return <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    children: React.ReactNode;
}

export function TableRow({ children, className = '', ...props }: TableRowProps) {
    return (
        <tr
            className={`group transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 even:bg-slate-50/50 dark:even:bg-slate-800/30 ${className}`}
            {...props}
        >
            {children}
        </tr>
    );
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
    children: React.ReactNode;
}

export function TableHead({ children, className = '', onClick, ...props }: TableHeadProps) {
    return (
        <th
            className={`px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 ${onClick ? 'cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors' : ''} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </th>
    );
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
    children: React.ReactNode;
}

export function TableCell({ children, className = '', ...props }: TableCellProps) {
    return (
        <td className={`px-6 py-4 text-slate-600 dark:text-slate-400 ${className}`} {...props}>
            {children}
        </td>
    );
}
