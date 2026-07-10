'use client';

import * as React from 'react';
import { CircleHelp } from 'lucide-react';
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
  tone = 'warning',
  className,
  role,
  'aria-live': ariaLive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  title?: React.ReactNode;
  copy?: React.ReactNode;
  warning?: React.ReactNode;
  tone?: 'info' | 'warning' | 'error';
}) {
  if (!title && !copy && !warning) {
    return null;
  }

  const resolvedRole = role ?? (tone === 'error' ? 'alert' : undefined);
  const resolvedAriaLive = ariaLive ?? (tone === 'error' ? 'assertive' : undefined);
  const warningClassName = tone === 'error' ? 'mt-2 text-sm leading-6 text-[#fca5a5]' : 'mt-2 text-sm leading-6 text-[#f0c36a]';

  return (
    <div
      data-alert-authoring-callout="hertzbeat-ui-panel"
      data-alert-authoring-callout-tone={tone}
      className={cn(alertAuthoringPanelClassName, className)}
      role={resolvedRole}
      aria-live={resolvedAriaLive}
      {...props}
    >
      {title ? <div className="text-sm font-semibold text-[#eef2f7]">{title}</div> : null}
      {copy ? <div className="mt-1 text-sm leading-6 text-[#a9b0bb]">{copy}</div> : null}
      {warning ? <div className={warningClassName}>{warning}</div> : null}
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

export function AlertAuthoringInlineHelp({
  id,
  label,
  body,
  impact,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  id: string;
  label: string;
  body: React.ReactNode;
  impact?: React.ReactNode;
}) {
  return (
    <span
      data-alert-authoring-field-help-placement="inline-label"
      className={cn('group relative inline-flex align-middle', className)}
      {...props}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        data-alert-authoring-field-help-trigger="hertzbeat-ui-field-help"
        data-alert-authoring-field-help-button="icon-after-label"
        data-alert-authoring-field-help-visual="circle-help-icon"
        className="inline-flex h-4 w-4 items-center justify-center rounded-[3px] border-0 bg-transparent p-0 text-[#d8e4ff] transition hover:text-[#f5f7fb] focus:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
        onClick={event => {
          event.stopPropagation();
        }}
        onMouseDown={event => {
          event.stopPropagation();
        }}
      >
        <CircleHelp size={12} strokeWidth={2} aria-hidden="true" data-alert-authoring-field-help-icon="lucide-circle-help" />
      </button>
      <span
        id={id}
        role="tooltip"
        data-alert-authoring-field-help="hertzbeat-ui-field-tooltip"
        className="pointer-events-none absolute left-0 top-6 z-20 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover:block group-focus-within:block"
      >
        <span className="block text-[11px] leading-4 text-[#dbe4f0]">{body}</span>
        {impact ? <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{impact}</span> : null}
      </span>
    </span>
  );
}

export function AlertAuthoringRequiredMark({
  className,
  children = '*',
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-alert-authoring-required-mark="hertzbeat-ui-required"
      aria-hidden="true"
      className={cn('ml-1 text-[var(--ops-critical)]', className)}
      {...props}
    >
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
