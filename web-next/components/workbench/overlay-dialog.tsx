'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function OverlayDialog({
  open,
  title,
  kicker,
  footer,
  onClose,
  children,
  className,
  contentClassName,
  maxWidthClassName = 'max-w-5xl',
  placement = 'center'
}: {
  open: boolean;
  title: React.ReactNode;
  kicker?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidthClassName?: string;
  placement?: 'center' | 'right';
}) {
  if (!open) {
    return null;
  }
  const isSideDrawer = placement === 'right';
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isSideDrawer && event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex bg-[rgba(11,12,14,0.88)]',
        isSideDrawer ? 'items-stretch justify-end p-0' : 'items-center justify-center p-4'
      )}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      data-overlay-dialog="true"
      data-overlay-dialog-placement={placement}
      onClick={handleOverlayClick}
    >
      <div
        className={cn(
          isSideDrawer
            ? 'hb-scrollbar h-full max-h-screen w-full overflow-auto border-l border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]'
            : 'hb-scrollbar max-h-[92vh] w-full overflow-auto rounded-[4px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]',
          maxWidthClassName,
          className
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--ops-border-color)] px-5 py-4">
          <div className="min-w-0">
            {kicker ? <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{kicker}</div> : null}
            <div className="mt-1 text-lg font-semibold text-[var(--ops-text-primary)]">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] border border-[var(--ops-border-color)] bg-transparent text-[var(--ops-text-secondary)] transition hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)] hover:text-[var(--ops-text-primary)]"
          >
            <X size={16} />
          </button>
        </header>
        <div className={cn('px-5 py-4', contentClassName)}>{children}</div>
        {footer ? <footer className="border-t border-[var(--ops-border-color)] px-5 py-4">{footer}</footer> : null}
      </div>
    </div>
  );
}
