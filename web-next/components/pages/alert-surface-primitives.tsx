'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export function AlertSurfacePanel({
  className,
  children,
  tone = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: 'default' | 'raised' }) {
  return (
    <div
      data-alert-surface-panel-owner="cold-panel"
      className={cn(
        'rounded-[4px] border border-[var(--ops-border-color)] px-4 py-3',
        tone === 'raised' ? 'bg-[var(--ops-surface-raised)]' : 'bg-[var(--ops-surface-panel)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertSurfaceEmptyState({
  title,
  copy,
  actionLabel,
  onAction,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  copy: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className={cn('max-w-3xl', className)}
      data-alert-center-empty-state="angular-inline"
      {...props}
    >
      <div className="text-[15px] font-semibold text-[var(--ops-text-primary)]">{title}</div>
      <div className="mt-3 text-[13px] leading-6 text-[var(--ops-text-secondary)]">{copy}</div>
      {actionLabel ? (
        <AlertSurfaceActionButton className="mt-3" data-alert-center-empty-action="refresh" onClick={onAction}>
          {actionLabel}
        </AlertSurfaceActionButton>
      ) : null}
    </div>
  );
}

export function AlertSurfaceTableShell({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-alert-surface-table-shell-owner="cold-dense-table"
      className={cn(
        'overflow-x-auto rounded-[4px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertSurfaceActionLink({
  className,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      data-alert-surface-action-owner="cold-action"
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 text-[12px] font-medium text-[var(--ops-text-primary)] transition-colors hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-elevated)] hover:text-[var(--ops-text-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export function AlertSurfaceActionButton({
  className,
  type = 'button',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      data-alert-surface-action-owner="cold-action"
      type={type}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 text-[12px] font-medium text-[var(--ops-text-primary)] transition-colors hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-elevated)] hover:text-[var(--ops-text-primary)] disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AlertSurfaceTable({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('min-w-full border-collapse text-sm text-[var(--ops-text-secondary)]', className)} {...props}>
      {children}
    </table>
  );
}

export function AlertSurfaceTableHead({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'border-b border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] text-left text-[11px] uppercase tracking-[0.14em] text-[var(--ops-text-tertiary)]',
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function AlertSurfaceValuePill({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-alert-surface-value-pill-owner="cold-value"
      className={cn(
        'inline-flex min-h-7 items-center rounded-[3px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-2 text-[12px] text-[var(--ops-text-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function AlertSurfaceCheckboxLabel({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'flex items-center gap-2 text-xs text-[var(--ops-text-secondary)] [--alert-surface-muted:var(--ops-text-tertiary)]',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}
