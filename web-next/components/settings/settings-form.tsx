'use client';

import * as React from 'react';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { cn } from '../../lib/utils';

export function SettingsForm({
  children,
  className,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      data-settings-form-owner="cold-settings-form-owner"
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
  className
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label data-settings-form-field="cold-form-field" className={cn('grid gap-2', className)}>
      <span className="text-[12px] font-semibold text-[#a9b0bb]">{label}</span>
      <div className="w-full max-w-[400px]">{children}</div>
    </label>
  );
}

export const SettingsFormInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      data-settings-form-control="cold-input-control"
      className={cn(
        'h-8 w-full max-w-[400px] rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none placeholder:text-[#858d9a] focus-visible:border-[#4e74f8] focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.12)]',
        className
      )}
      {...props}
    />
  )
);

SettingsFormInput.displayName = 'SettingsFormInput';

export const SettingsFormSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <Select
      ref={ref}
      data-settings-form-control="cold-select-control"
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
  return <div className={cn('flex flex-wrap items-center gap-2 pt-1', className)} {...props}>{children}</div>;
}

export function SettingsFormFeedback({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-[12px] leading-5', className)} {...props}>{children}</div>;
}
