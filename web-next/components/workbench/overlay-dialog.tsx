'use client';

import React from 'react';
import { X } from 'lucide-react';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';
import { cn } from '../../lib/utils';

const DEFAULT_OVERLAY_DIALOG_CLOSE_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['common.dialog.close'] ?? 'common.dialog.close';

type OverlayDialogDataAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

type OverlayDialogProps = {
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
  closeLabel?: string;
  maskClosable?: boolean;
  overlayProps?: Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'className' | 'onClick' | 'title'> & OverlayDialogDataAttributes;
};

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
  placement = 'center',
  closeLabel = DEFAULT_OVERLAY_DIALOG_CLOSE_LABEL,
  maskClosable,
  overlayProps
}: OverlayDialogProps) {
  if (!open) {
    return null;
  }
  const isSideDrawer = placement === 'right';
  const isMaskClosable = maskClosable ?? isSideDrawer;
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isMaskClosable && event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      {...overlayProps}
      className={cn(
        'fixed inset-0 z-50 flex bg-[rgba(11,12,14,0.88)]',
        isSideDrawer ? 'items-stretch justify-end p-0' : 'items-center justify-center p-4'
      )}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      data-overlay-dialog="true"
      data-overlay-dialog-placement={placement}
      data-overlay-dialog-mask-closable={isMaskClosable ? 'true' : 'false'}
      onClick={handleOverlayClick}
    >
      <div
        className={cn(
          isSideDrawer
            ? 'h-full max-h-screen w-full overflow-hidden border-l border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]'
            : 'max-h-[92vh] w-full overflow-hidden rounded-[4px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]',
          'flex flex-col',
          maxWidthClassName,
          className
        )}
        data-overlay-dialog-panel="bounded"
        data-overlay-dialog-panel-scroll-contract="header-footer-visible-content-scroll"
      >
        <header
          className="shrink-0 border-b border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-5 py-4"
          data-overlay-dialog-header="visible"
        >
          <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {kicker ? <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{kicker}</div> : null}
            <div className="mt-1 text-lg font-semibold text-[var(--ops-text-primary)]">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] border border-[var(--ops-border-color)] bg-transparent text-[var(--ops-text-secondary)] transition hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)] hover:text-[var(--ops-text-primary)]"
          >
            <X size={16} />
          </button>
          </div>
        </header>
        <div
          className={cn('hb-scrollbar min-h-0 flex-1 overflow-auto px-5 py-4', contentClassName)}
          data-overlay-dialog-content="scroll-region"
        >
          {children}
        </div>
        {footer ? (
          <footer
            className="shrink-0 border-t border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-5 py-4"
            data-overlay-dialog-footer="visible-action-bar"
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
