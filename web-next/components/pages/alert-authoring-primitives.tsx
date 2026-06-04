'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

const alertAuthoringPanelClassName =
  'rounded-[4px] border border-[#2b3039] bg-[#101217] px-4 py-3';

export const alertAuthoringSelectClassName =
  'border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)] focus-visible:border-[var(--ops-primary)] focus-visible:bg-[var(--ops-surface-panel)]';

export function AlertAuthoringPanel({
  heading,
  children,
  className,
  headingClassName,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  heading?: React.ReactNode;
  headingClassName?: string;
}) {
  return (
    <div data-alert-authoring-panel="hertzbeat-ui-panel" className={cn('space-y-2', alertAuthoringPanelClassName, className)} {...props}>
      {heading ? (
        <div className={cn('text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]', headingClassName)}>
          {heading}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function AlertAuthoringCallout({
  title,
  copy,
  warning,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  title?: React.ReactNode;
  copy?: React.ReactNode;
  warning?: React.ReactNode;
}) {
  if (!title && !copy && !warning) {
    return null;
  }

  return (
    <div data-alert-authoring-callout="hertzbeat-ui-panel" className={cn(alertAuthoringPanelClassName, className)} {...props}>
      {title ? <div className="text-sm font-semibold text-[#eef2f7]">{title}</div> : null}
      {copy ? <div className="mt-1 text-sm leading-6 text-[#a9b0bb]">{copy}</div> : null}
      {warning ? <div className="mt-2 text-sm leading-6 text-[#f0c36a]">{warning}</div> : null}
    </div>
  );
}

export function AlertAuthoringFieldLabel({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('space-y-1 text-sm text-[var(--ops-text-secondary)]', className)} {...props}>
      {children}
    </label>
  );
}

export function AlertAuthoringRequiredMark({
  className,
  children = '*',
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('ml-1 text-[var(--ops-critical)]', className)} {...props}>
      {children}
    </span>
  );
}

export function AlertAuthoringToggleRow({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-alert-authoring-toggle-row="inline-control"
      className={cn(
        'flex min-h-8 items-center gap-2 text-sm text-[#a9b0bb]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertAuthoringActionPill({
  className,
  type = 'button',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      data-alert-authoring-action-pill="hertzbeat-ui-action"
      type={type}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] transition-colors hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AlertAuthoringValuePill({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-alert-authoring-value-pill="hertzbeat-ui-value"
      className={cn(
        'inline-flex min-h-7 items-center rounded-[3px] border border-[#303743] bg-[#101217] px-2 text-[12px] font-semibold text-[#cbd5e1]',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
