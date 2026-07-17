import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ReactNode } from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Button({
  children,
  variant = 'primary',
  className,
  ...props
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-hover',
    secondary: 'bg-surface-muted text-foreground hover:bg-border',
    ghost: 'bg-transparent text-foreground hover:bg-surface-muted',
    danger: 'bg-danger text-white hover:bg-red-700',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center h-9 px-4 rounded-btn text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        'min-w-[2.5rem]',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-border rounded-card p-4 sm:p-6 shadow-sm', className)}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}) {
  const tones = {
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
    neutral: 'bg-surface-muted text-foreground-muted',
  };
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', tones[tone])}>{children}</span>;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn('h-9 px-3 rounded-btn border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand', className)}
      {...props}
    />
  );
}

export function Table({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className, ...props }: { children?: ReactNode; className?: string } & React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('text-left font-medium text-foreground-muted px-4 py-3 bg-surface', className)} {...props}>{children}</th>;
}

export function Td({ children, className, ...props }: { children?: ReactNode; className?: string } & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 border-t border-border', className)} {...props}>{children}</td>;
}
