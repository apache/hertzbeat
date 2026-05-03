'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export type ContextChipBarItem = {
  label: string;
  value: string;
};

export function ContextChipBar({
  items,
  dense = false,
  variant = 'inline',
  className
}: {
  items: ContextChipBarItem[];
  dense?: boolean;
  variant?: 'inline' | 'header';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'platform-context-chip-bar min-w-0',
        variant === 'header'
          ? 'platform-context-chip-bar--header grid w-full grid-cols-1 gap-0 sm:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]'
          : 'platform-context-chip-bar--inline flex flex-wrap items-center gap-2',
        dense && 'platform-context-chip-bar--dense',
        className
      )}
      data-observability-context-chip-bar="true"
      data-observability-context-chip-variant={variant}
    >
      {items.map(item => (
        <span
          key={`${item.label}-${item.value}`}
          className={cn(
            'platform-context-chip min-w-0 text-[var(--ops-text-secondary)]',
            variant === 'header'
              ? 'block border-b border-[var(--ops-border-color)] py-2 sm:border-b-0 sm:border-l sm:py-0 sm:pl-3 sm:first:border-l-0 sm:first:pl-0'
              : 'inline-flex items-center gap-1 rounded-[999px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2.5 py-1 text-[11px]',
            dense && variant === 'inline' && 'px-2 py-0.5 text-[10px]',
            dense && variant === 'header' && 'py-1.5 sm:py-0'
          )}
        >
          <span className="platform-context-chip-label block text-[11px] font-semibold uppercase leading-[1.2] tracking-[0.08em] text-[var(--ops-text-tertiary)]">
            {item.label}
          </span>
          <strong
            className={cn(
              'platform-context-chip-value font-semibold text-[var(--ops-text-primary)]',
              variant === 'header' ? 'mt-1.5 block text-sm leading-[1.35] break-words' : 'text-[11px]'
            )}
          >
            {item.value}
          </strong>
        </span>
      ))}
    </div>
  );
}
