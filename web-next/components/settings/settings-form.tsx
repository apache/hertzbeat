'use client';

import * as React from 'react';
import { CircleHelp } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, type SelectProps } from '../ui/select';
import { cn } from '../../lib/utils';

export function SettingsForm({
  children,
  className,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      data-settings-form-owner="hertzbeat-ui-settings-form-owner"
      className={cn(
        'flex min-h-[316px] w-full flex-col gap-5 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.32)]',
        className
      )}
      {...props}
    >
      {children}
    </form>
  );
}

export function SettingsFormField({
  label,
  children,
  className,
  help,
  requirement,
  inputMode
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  help?: {
    label: string;
    body: React.ReactNode;
    impact?: React.ReactNode;
  };
  requirement?: {
    tone: 'required' | 'optional' | 'recommended';
    label: string;
  };
  inputMode?: {
    mode: 'manual' | 'selection' | 'generated';
    label: string;
  };
}) {
  const helpTooltipId = React.useId();
  const controlElement = children as React.ReactElement<{ 'aria-label'?: string }>;
  const labelledControl = React.isValidElement(children)
    ? React.cloneElement(controlElement, {
      'aria-label': controlElement.props['aria-label'] || label
    })
    : children;

  return (
    <label data-settings-form-field="hertzbeat-ui-form-field" className={cn('grid gap-2', className)}>
      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] font-semibold text-[#a9b0bb]">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span>{label}</span>
          {help ? (
            <span
              data-settings-form-field-help-placement="inline-label"
              className="group relative inline-flex align-middle"
            >
              <button
                type="button"
                aria-label={help.label}
                aria-describedby={helpTooltipId}
                data-settings-form-field-help-trigger="hertzbeat-ui-field-help"
                data-settings-form-field-help-style="icon-after-label"
                data-settings-form-field-help-visual="circle-help-icon"
                className="inline-flex h-4 w-4 items-center justify-center border-0 bg-transparent p-0 text-[#d8e4ff] transition hover:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
                onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <CircleHelp aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
              <span
                id={helpTooltipId}
                role="tooltip"
                data-settings-form-field-help="hertzbeat-ui-field-tooltip"
                className="pointer-events-none absolute left-0 top-6 z-20 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover:block group-focus-within:block"
              >
                <span className="block text-[11px] leading-4 text-[#dbe4f0]">{help.body}</span>
                {help.impact ? <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{help.impact}</span> : null}
              </span>
            </span>
          ) : null}
        </span>
        {requirement || inputMode ? (
          <span data-settings-form-field-meta="requirement-and-input-mode" className="inline-flex min-w-0 flex-wrap items-center gap-1">
            {requirement ? (
              <span
                data-settings-form-field-requirement={requirement.tone}
                className={cn(
                  'rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold',
                  requirement.tone === 'required'
                    ? 'bg-[#3b1d1d] text-[#ffb4b4]'
                    : requirement.tone === 'recommended'
                      ? 'bg-[#17213a] text-[#d8e4ff]'
                      : 'bg-[#101217] text-[#98a2b3]'
                )}
              >
                {requirement.label}
              </span>
            ) : null}
            {inputMode ? (
              <span
                data-settings-form-field-input-mode={inputMode.mode}
                className={cn(
                  'rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold',
                  inputMode.mode === 'selection'
                    ? 'border-[#31405c] bg-[#182238] text-[#d8e4ff]'
                    : 'border-[#2b3039] bg-[#101217] text-[#98a2b3]'
                )}
              >
                {inputMode.label}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
      <div className="w-full max-w-[400px]">{labelledControl}</div>
    </label>
  );
}

export const SettingsFormInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      data-settings-form-control="hertzbeat-ui-input-control"
      className={cn(
        'h-8 w-full max-w-[400px] rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none placeholder:text-[#858d9a] focus-visible:border-[#4e74f8] focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.12)]',
        className
      )}
      {...props}
    />
  )
);

SettingsFormInput.displayName = 'SettingsFormInput';

export const SettingsFormSelect = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <Select
      ref={ref}
      data-settings-form-control="hertzbeat-ui-select-control"
      data-settings-form-select-width="angular-400px"
      data-settings-form-select-style="angular-centered-bold"
      data-settings-form-select-dropdown-style="angular-bold-larger"
      containerClassName="w-full max-w-[400px]"
      className={cn(
        'max-w-[400px] text-center [text-align-last:center]',
        className
      )}
      {...props}
    >
      {children}
    </Select>
  )
);

SettingsFormSelect.displayName = 'SettingsFormSelect';

export function SettingsFormActions({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-settings-form-actions-owner="hertzbeat-ui-settings-actions"
      className={cn('flex flex-wrap items-center gap-2 pt-1', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function SettingsFormActionHelp({
  id,
  label,
  body,
  impact
}: {
  id: string;
  label: string;
  body: React.ReactNode;
  impact?: React.ReactNode;
}) {
  const tooltipId = `settings-form-action-help-${id}`;
  return (
    <span data-settings-form-action-help={id} className="group/help relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        data-settings-form-action-help-trigger="hertzbeat-ui-action-help"
        data-settings-form-action-help-style="icon-after-action"
        data-settings-form-action-help-visual="circle-help-icon"
        className="inline-flex h-4 w-4 items-center justify-center text-[#d8e4ff] transition hover:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <CircleHelp aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        data-settings-form-action-help-tooltip={id}
        className="pointer-events-none absolute left-0 top-6 z-30 hidden w-[300px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover/help:block group-focus-within/help:block"
      >
        <span className="block text-[11px] leading-4 text-[#dbe4f0]">{body}</span>
        {impact ? <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{impact}</span> : null}
      </span>
    </span>
  );
}

export function SettingsFormFeedback({
  children,
  className,
  tone = 'info',
  role,
  'aria-live': ariaLive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: 'success' | 'error' | 'info';
}) {
  const feedbackRole = role ?? (tone === 'error' ? 'alert' : 'status');
  const feedbackLive = ariaLive ?? (tone === 'error' ? 'assertive' : 'polite');

  return (
    <div
      role={feedbackRole}
      aria-live={feedbackLive}
      data-settings-form-feedback="hertzbeat-ui-settings-feedback"
      data-settings-form-feedback-tone={tone}
      className={cn(
        'rounded-[3px] border px-3 py-2 text-[12px] leading-5',
        tone === 'error'
          ? 'border-rose-300/25 bg-rose-300/10 text-rose-100'
          : tone === 'success'
            ? 'border-[#2f4a3b] bg-[#101217] text-[#9fd8b5]'
            : 'border-[#31405c] bg-[#101217] text-[#b8c4d8]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
