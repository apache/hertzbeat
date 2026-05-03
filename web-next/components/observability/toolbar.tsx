'use client';

import * as React from 'react';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { cn } from '../../lib/utils';

type ToolbarRowProps = {
  children: React.ReactNode;
  className?: string;
};

export function ToolbarRow({ children, className }: ToolbarRowProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-2 rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3 shadow-none',
        className
      )}
    >
      {children}
    </div>
  );
}

type FieldWrapperProps = {
  label?: string;
  children: React.ReactNode;
  className?: string;
};

export function FieldWrapper({
  label,
  children,
  className
}: FieldWrapperProps) {
  return (
    <div className={cn('flex min-w-[170px] flex-1 flex-col gap-1', className)}>
      {label ? <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{label}</div> : null}
      {children}
    </div>
  );
}

export function ToolbarField(props: FieldWrapperProps) {
  return <FieldWrapper {...props} />;
}

type ToolbarGroupProps = {
  children: React.ReactNode;
  className?: string;
};

export function ToolbarGroup({ children, className }: ToolbarGroupProps) {
  return <div className={cn('flex flex-1 flex-wrap items-end gap-3', className)}>{children}</div>;
}

export interface ToolbarInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const ToolbarInput = React.forwardRef<HTMLInputElement, ToolbarInputProps>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn(
      'h-8 rounded-[2px] border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-1.5 text-[12px] text-[var(--ops-text-primary)] shadow-none placeholder:text-[var(--ops-text-tertiary)] focus-visible:border-[var(--ops-primary)] focus-visible:bg-[var(--ops-surface-panel)] focus-visible:ring-[rgba(78,116,248,0.12)]',
      className
    )}
    {...props}
  />
));

ToolbarInput.displayName = 'ToolbarInput';

export interface ToolbarNativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const ToolbarNativeSelect = React.forwardRef<HTMLSelectElement, ToolbarNativeSelectProps>(({ className, children, ...props }, ref) => (
  <Select
    ref={ref}
    className={cn(
      'h-8 text-[12px] text-[var(--ops-text-primary)]',
      className
    )}
    {...props}
  >
    {children}
  </Select>
));

ToolbarNativeSelect.displayName = 'ToolbarNativeSelect';
