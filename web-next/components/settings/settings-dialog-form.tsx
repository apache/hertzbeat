'use client';

import * as React from 'react';
import { CircleHelp } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, type SelectProps } from '../ui/select';
import { cn } from '../../lib/utils';

export function SettingsDialogForm({
  children,
  className,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form data-settings-dialog-form="hertzbeat-ui-dialog-form" className={cn('grid gap-3.5', className)} {...props}>
      {children}
    </form>
  );
}

export function SettingsDialogField({
  label,
  required,
  children,
  className,
  help,
  requirement,
  inputMode,
  layout = 'horizontal'
}: {
  label: string;
  required?: boolean;
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
  layout?: 'horizontal' | 'vertical';
}) {
  const isVertical = layout === 'vertical';
  const helpTooltipId = React.useId();
  const controlElement = children as React.ReactElement<{ 'aria-label'?: string }>;
  const labelledControl = React.isValidElement(children)
    ? React.cloneElement(controlElement, {
      'aria-label': controlElement.props['aria-label'] || label
    })
    : children;

  return (
    <label
      data-settings-dialog-field="hertzbeat-ui-dialog-field"
      data-settings-dialog-field-layout={isVertical ? 'angular-vertical-form' : 'angular-label-7-control-12'}
      className={cn(isVertical ? 'grid gap-1.5' : 'grid gap-2 md:grid-cols-[7fr_12fr] md:items-center', className)}
    >
      <span data-settings-dialog-label-span={isVertical ? 'vertical' : '7'} className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] font-semibold text-[#dbe4f0]">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span>{label}</span>
          {help ? (
            <span
              data-settings-dialog-field-help-placement="inline-label"
              className="group relative inline-flex align-middle"
            >
              <button
                type="button"
                aria-label={help.label}
                aria-describedby={helpTooltipId}
                data-settings-dialog-field-help-trigger="hertzbeat-ui-field-help"
                data-settings-dialog-field-help-style="icon-after-label"
                data-settings-dialog-field-help-visual="circle-help-icon"
                className="inline-flex h-4 w-4 items-center justify-center border-0 bg-transparent text-[11px] font-semibold leading-none text-[#8da2ff] transition hover:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
                onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <CircleHelp size={12} strokeWidth={2} aria-hidden="true" data-settings-dialog-field-help-icon="lucide-circle-help" />
              </button>
              <span
                id={helpTooltipId}
                role="tooltip"
                data-settings-dialog-field-help="hertzbeat-ui-field-tooltip"
                className="pointer-events-none absolute left-0 top-6 z-20 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover:block group-focus-within:block"
              >
                <span className="block text-[11px] leading-4 text-[#dbe4f0]">{help.body}</span>
                {help.impact ? <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{help.impact}</span> : null}
              </span>
            </span>
          ) : null}
          {required ? <span className="text-[#8da2ff]">*</span> : null}
        </span>
        {requirement || inputMode ? (
          <span data-settings-dialog-field-meta="requirement-and-input-mode" className="inline-flex min-w-0 flex-wrap items-center gap-1">
            {requirement ? (
              <span
                data-settings-dialog-field-requirement={requirement.tone}
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
                data-settings-dialog-field-input-mode={inputMode.mode}
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
      <div data-settings-dialog-control-span={isVertical ? 'vertical' : '12'} className="min-w-0">{labelledControl}</div>
    </label>
  );
}

export const SettingsDialogInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      data-settings-dialog-control="hertzbeat-ui-input-control"
      className={cn(
        'h-8 w-full rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 py-1.5 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none placeholder:text-[#858d9a] transition-colors focus-visible:border-[#4e74f8] focus-visible:bg-[#151b28] focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.12)]',
        className
      )}
      {...props}
    />
  )
);

SettingsDialogInput.displayName = 'SettingsDialogInput';

export const SettingsDialogSelect = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <Select
      ref={ref}
      data-settings-dialog-control="hertzbeat-ui-select-control"
      containerClassName="w-full"
      className={cn(
        'h-8 text-[12px] font-semibold',
        className
      )}
      {...props}
    >
      {children}
    </Select>
  )
);

SettingsDialogSelect.displayName = 'SettingsDialogSelect';

export function SettingsDialogToggle({
  checked,
  onCheckedChange,
  className,
  'aria-label': ariaLabel
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-150',
        checked ? 'border-[var(--ops-primary)] bg-[rgba(78,116,248,0.24)]' : 'border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]',
        className
      )}
    >
      <span
        className={cn(
          'inline-block h-4.5 w-4.5 rounded-full bg-[var(--ops-text-primary)] shadow-[0_1px_4px_rgba(0,0,0,0.35)] transition-transform duration-150',
          checked ? 'translate-x-5.5' : 'translate-x-1'
        )}
      />
      <span className="sr-only">{checked ? 'on' : 'off'}</span>
    </button>
  );
}

export function SettingsDialogFooter({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-settings-dialog-footer-owner="hertzbeat-ui-dialog-footer"
      className={cn('flex flex-wrap justify-end gap-2', className)}
    >
      {children}
    </div>
  );
}

export function SettingsDialogActionHelp({
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
  const tooltipId = `settings-dialog-action-help-${id}`;
  return (
    <span data-settings-dialog-action-help={id} className="group/help relative inline-flex h-4 w-4 items-center justify-center">
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        data-settings-dialog-action-help-trigger="hertzbeat-ui-action-help"
        data-settings-dialog-action-help-style="icon-after-action"
        data-settings-dialog-action-help-visual="circle-help-icon"
        className="inline-flex h-4 w-4 items-center justify-center border-0 bg-transparent text-[#8da2ff] transition hover:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
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
        data-settings-dialog-action-help-tooltip={id}
        className="pointer-events-none absolute right-0 top-6 z-30 hidden w-[300px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover/help:block group-focus-within/help:block"
      >
        <span className="block text-[11px] leading-4 text-[#dbe4f0]">{body}</span>
        {impact ? <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{impact}</span> : null}
      </span>
    </span>
  );
}
