'use client';

import React from 'react';
import { cn } from '../../lib/utils';

type ObservabilityChipToggleProps = {
  children: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  selectionAttrName?: string;
  className?: string;
  tone?: 'deck' | 'operator';
};

export function ObservabilityChipToggle({
  children,
  selected = false,
  disabled = false,
  onClick,
  selectionAttrName,
  className,
  tone = 'deck',
}: ObservabilityChipToggleProps) {
  const selectionProps = selectionAttrName ? { [selectionAttrName]: selected ? 'true' : 'false' } : {};

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 rounded-[2px] border px-2.5 py-1 text-[11px] font-medium transition',
        tone === 'operator' ? 'tracking-[0.03em]' : 'uppercase tracking-[0.12em]',
        selected
          ? 'border-[var(--ops-primary)] bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)]'
          : 'border-[var(--ops-border-color)] bg-transparent text-[var(--ops-text-secondary)] hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-panel)] hover:text-[var(--ops-text-primary)]',
        disabled && 'cursor-default opacity-60',
        className
      )}
      onClick={onClick}
      {...selectionProps}
    >
      {children}
    </button>
  );
}
