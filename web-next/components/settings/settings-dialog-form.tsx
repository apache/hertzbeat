'use client';

import * as React from 'react';
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
  layout = 'horizontal'
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  layout?: 'horizontal' | 'vertical';
}) {
  const isVertical = layout === 'vertical';

  return (
    <label
      data-settings-dialog-field="hertzbeat-ui-dialog-field"
      data-settings-dialog-field-layout={isVertical ? 'angular-vertical-form' : 'angular-label-7-control-12'}
      className={cn(isVertical ? 'grid gap-1.5' : 'grid gap-2 md:grid-cols-[7fr_12fr] md:items-center', className)}
    >
      <span
        data-settings-dialog-label-span={isVertical ? 'vertical' : '7'}
        className="text-[12px] font-semibold text-[#dbe4f0]"
      >
        {label}
        {required ? <span className="ml-1 text-[#8da2ff]">*</span> : null}
      </span>
      <div data-settings-dialog-control-span={isVertical ? 'vertical' : '12'} className="min-w-0">{children}</div>
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
  className
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
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
  return <div className={cn('flex justify-end gap-2', className)}>{children}</div>;
}
