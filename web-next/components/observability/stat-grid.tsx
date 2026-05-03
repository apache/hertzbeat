'use client';

import React from 'react';

export type ObservabilityStatGridItem = {
  label: string;
  value: string;
  tone?: string;
};

export function ObservabilityStatGrid({
  items,
  columns = 3,
  tone = 'default',
  variant = 'grid'
}: {
  items: ObservabilityStatGridItem[];
  columns?: 2 | 3 | 4;
  tone?: 'default' | 'deck' | 'operator';
  variant?: 'grid' | 'pills';
}) {
  const columnClass =
    columns === 2 ? 'sm:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3';

  if (variant === 'pills') {
    return (
      <div className="flex flex-wrap items-center gap-2" data-observability-stat-grid="pills">
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="inline-flex h-7 items-center gap-2 rounded-[8px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-2.5 text-[12px] text-[var(--ops-text-secondary)]"
          >
            <span>{item.label}</span>
            <span className="font-semibold text-[var(--ops-text-primary)]">{item.value}</span>
          </div>
        ))}
      </div>
    );
  }

  if (tone === 'deck' || tone === 'operator') {
    return (
      <div
        className={`grid divide-y divide-[var(--ops-border-color)] border-y border-[var(--ops-border-color)] sm:divide-y-0 sm:divide-x sm:divide-[var(--ops-border-color)] ${columnClass}`}
      >
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="px-0 py-2.5">
            <div className={tone === 'operator' ? 'text-[10px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]' : 'text-[10px] uppercase tracking-[0.18em] text-[var(--ops-text-tertiary)]'}>
              {item.label}
            </div>
            <div className={tone === 'operator' ? 'mt-1 text-sm font-semibold text-[var(--ops-text-primary)]' : 'mt-1 text-sm font-semibold text-[var(--ops-text-primary)]'}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-3 ${columnClass}`}>
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ops-text-tertiary)]">{item.label}</div>
          <div className="mt-1 text-sm font-medium text-[var(--ops-text-primary)]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
