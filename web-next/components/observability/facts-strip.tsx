'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export type FactsStripItem = {
  label: string;
  value: string;
  tone?: 'default' | 'critical' | 'success' | 'warning';
};

const toneClassNames: Record<NonNullable<FactsStripItem['tone']>, string> = {
  default: 'text-[var(--ops-text-primary)]',
  critical: 'text-[var(--ops-danger)]',
  success: 'text-[var(--ops-success)]',
  warning: 'text-[var(--ops-warning)]'
};

export function FactsStrip({
  items,
  dense = false,
  compact = false,
  tone = 'operator',
  className
}: {
  items: FactsStripItem[];
  dense?: boolean;
  compact?: boolean;
  tone?: 'default' | 'deck' | 'operator';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid divide-y divide-[var(--ops-border-color)] border-y border-[var(--ops-border-color)] sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0',
        dense ? 'gap-0' : 'gap-0',
        compact && 'text-[12px]',
        tone === 'default' && 'rounded-[6px] bg-[var(--ops-surface-panel)]',
        className
      )}
      data-observability-facts-strip="true"
    >
      {items.map(item => (
        <div
          key={`${item.label}-${item.value}`}
          className={cn('px-0 py-2.5', dense && 'py-2', compact && 'py-1.5')}
        >
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{item.label}</div>
          <div className={cn('mt-1 text-sm font-semibold', toneClassNames[item.tone ?? 'default'])}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}
