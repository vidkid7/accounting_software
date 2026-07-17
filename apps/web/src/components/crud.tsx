import type { ReactNode } from 'react';
import { cn, Card } from './ui';
import { useLang } from '../store/lang';

export { cn };

export function PageHeader({
  title,
  action,
  subtitle,
}: {
  title: ReactNode;
  action?: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{title}</h1>
        {subtitle && <p className="text-sm text-foreground-muted mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-foreground-muted uppercase tracking-wide">{label}</p>
      <p className={cn('mt-2 text-2xl font-semibold tabular', tone)}>{value}</p>
    </Card>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-stretch sm:items-center sm:justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-card max-h-full sm:max-h-[90vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold font-deva truncate">{title}</h2>
          <button className="text-foreground-muted hover:text-foreground text-2xl leading-none p-1 -mr-1" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-4 sm:px-6 py-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
}: {
  open: boolean;
  message: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}) {
  const { t } = useLang();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onCancel}>
      <div className="bg-white w-full sm:max-w-sm sm:rounded-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 sm:px-6 py-5 text-sm text-foreground font-deva">{message}</div>
        <div className="px-4 sm:px-6 py-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button className="h-9 px-4 rounded-btn bg-surface-muted text-foreground hover:bg-border text-sm" onClick={onCancel}>
            {t?.('common.cancel') ?? 'Cancel'}
          </button>
          <button className="h-9 px-4 rounded-btn bg-danger text-white hover:bg-red-700 text-sm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium text-foreground-muted mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn('h-9 px-3 rounded-btn border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand', className)}
      {...props}
    />
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-10 text-center text-foreground-muted text-sm">{children}</div>;
}
