'use client';

import React, { useId } from 'react';
import { ToolbarInput } from './toolbar';
import { cn } from '../../lib/utils';

type ObservabilitySearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  name?: string;
  tone?: 'default' | 'deck' | 'operator';
};

export function ObservabilitySearchInput({
  value,
  onChange,
  placeholder,
  className,
  name,
  tone = 'default',
}: ObservabilitySearchInputProps) {
  const generatedId = useId().replace(/:/g, '');

  return (
    <ToolbarInput
      aria-label={placeholder}
      id={name ?? generatedId}
      name={name ?? generatedId}
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn(
        tone === 'deck'
          ? 'h-9 rounded-none border-x-0 border-t-0 border-b border-[var(--ops-border-color)] bg-transparent px-0 py-2 text-[12px] text-[var(--ops-text-primary)] placeholder:text-[var(--ops-text-tertiary)] focus:border-[var(--ops-primary)] focus:ring-0'
          : tone === 'operator'
            ? 'h-9 rounded-none border-x-0 border-t-0 border-b border-[var(--ops-border-color)] bg-transparent px-0 py-2 text-[12px] text-[var(--ops-text-primary)] placeholder:text-[var(--ops-text-tertiary)] focus:border-[var(--ops-primary)] focus:ring-0'
            : 'h-8 rounded-[2px] border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-1.5 text-[12px] text-[var(--ops-text-primary)] placeholder:text-[var(--ops-text-tertiary)] focus:border-[var(--ops-primary)] focus:ring-0',
        className
      )}
    />
  );
}
