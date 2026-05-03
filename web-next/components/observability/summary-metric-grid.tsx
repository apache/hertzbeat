'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export type SummaryMetricGridItem = {
  label: string;
  value: string;
  meta?: string;
};

export function SummaryMetricGrid({
  items,
  dense = false,
  compact = false,
  tone = 'default',
  className
}: {
  items: SummaryMetricGridItem[];
  dense?: boolean;
  compact?: boolean;
  tone?: 'default' | 'deck' | 'operator';
  className?: string;
}) {
  const gridClassName = compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-4';

  return (
    <div className={cn(`grid gap-3 ${gridClassName}`, className)} data-observability-summary-metric-grid="true">
      {items.map(item => (
        <div
          key={`${item.label}-${item.value}`}
          className={cn(
            'rounded-[6px] border border-[var(--ops-border-color)] px-3 py-2.5',
            tone === 'default' ? 'bg-[var(--ops-surface-raised)]' : 'bg-transparent',
            dense && 'px-2.5 py-2'
          )}
        >
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{item.label}</div>
          <div className="mt-1 text-sm font-semibold text-[var(--ops-text-primary)]">{item.value}</div>
          {item.meta ? <div className="mt-1 text-[11px] text-[var(--ops-text-secondary)]">{item.meta}</div> : null}
        </div>
      ))}
    </div>
  );
}
