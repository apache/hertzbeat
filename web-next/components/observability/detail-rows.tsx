'use client';

import React from 'react';

export type ObservabilityDetailRow = {
  title: string;
  copy: string;
  meta?: string;
};

export function ObservabilityDetailRows({
  rows,
  tone = 'default',
}: {
  rows: ObservabilityDetailRow[];
  tone?: 'default' | 'deck' | 'operator';
}) {
  return (
    <div
      className={
        tone === 'deck'
          ? 'border-y border-[var(--ops-border-color)]'
          : tone === 'operator'
            ? 'border-y border-[var(--ops-border-color)]'
            : 'divide-y divide-[var(--ops-border-color)] rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)]'
      }
    >
      {rows.map((row, index) => (
        <div
          key={`${row.title}-${row.copy}-${row.meta ?? ''}`}
          className={
            tone === 'deck'
              ? `grid gap-1 px-0 py-2.5 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-start ${index > 0 ? 'border-t border-[var(--ops-border-color)]' : ''}`
              : tone === 'operator'
                ? `grid gap-1 px-0 py-2.5 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-start ${index > 0 ? 'border-t border-[var(--ops-border-color)]' : ''}`
              : 'grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-start'
          }
        >
          <span
            className={
              tone === 'deck'
                ? 'text-[11px] uppercase tracking-[0.18em] text-[var(--ops-text-tertiary)]'
                : tone === 'operator'
                  ? 'text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]'
                  : 'text-[11px] uppercase tracking-[0.18em] text-[var(--ops-text-tertiary)]'
            }
          >
            {row.title}
          </span>
          <div
            className={
              tone === 'deck'
                ? 'space-y-1 text-sm text-[var(--ops-text-secondary)] sm:text-right'
                : tone === 'operator'
                  ? 'space-y-1 text-sm text-[var(--ops-text-primary)] sm:text-right'
                  : 'space-y-1 text-sm text-[var(--ops-text-secondary)] sm:text-right'
            }
          >
            <div>{row.copy}</div>
            {row.meta && row.meta !== '-' ? (
              <div
                className={
                  tone === 'deck'
                    ? 'text-[10px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]'
                    : tone === 'operator'
                      ? 'text-[10px] uppercase tracking-[0.14em] text-[var(--ops-text-tertiary)]'
                      : 'text-[10px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]'
                }
              >
                {row.meta}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
