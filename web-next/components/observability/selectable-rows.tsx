'use client';

import React from 'react';
import { ObservabilityDetailRows, type ObservabilityDetailRow } from './detail-rows';
import { cn } from '../../lib/utils';

export type ObservabilitySelectableRow = ObservabilityDetailRow & {
  key: string;
};

type ObservabilitySelectableRowsProps = {
  rows: ObservabilitySelectableRow[];
  selectedKey?: string | null;
  onSelect: (key: string) => void;
  heading?: string;
  emptyFallback?: React.ReactNode;
  selectionAttrName?: string;
  tone?: 'deck' | 'operator';
};

export function ObservabilitySelectableRows({
  rows,
  selectedKey,
  onSelect,
  heading,
  emptyFallback = null,
  selectionAttrName = 'data-selected',
  tone = 'deck',
}: ObservabilitySelectableRowsProps) {
  if (rows.length === 0) return <>{emptyFallback}</>;

  return (
    <div className="space-y-2">
      {heading ? (
        <div
          className={cn(
            'text-[11px] uppercase text-[var(--ops-text-tertiary)]',
            tone === 'operator' ? 'tracking-[0.16em]' : 'tracking-[0.18em]'
          )}
        >
          {heading}
        </div>
      ) : null}
      <div className="grid gap-2">
        {rows.map(row => {
          const selected = selectedKey === row.key;
          return (
            <button
              key={row.key}
              type="button"
              {...{ [selectionAttrName]: selected ? 'true' : 'false' }}
              className={cn(
                'grid gap-1 border-b px-0 py-2.5 text-left transition sm:grid-cols-[minmax(0,180px)_1fr] sm:items-start',
                selected
                  ? 'border-[var(--ops-primary)] bg-[var(--ops-surface-raised)] shadow-[inset_2px_0_0_0_var(--ops-primary)]'
                  : 'border-[var(--ops-border-color)] hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-panel)]'
              )}
              onClick={() => onSelect(row.key)}
            >
              <span
                className={cn(
                  'text-[11px] uppercase text-[var(--ops-text-tertiary)]',
                  tone === 'operator' ? 'tracking-[0.16em]' : 'tracking-[0.18em]'
                )}
              >
                {row.title}
              </span>
              <div className="space-y-1 text-sm text-[var(--ops-text-primary)] sm:text-right">
                <div>{row.copy}</div>
                {row.meta && row.meta !== '-' ? (
                  <div
                    className={cn(
                      'uppercase text-[var(--ops-text-secondary)]',
                      tone === 'operator' ? 'text-[10px] tracking-[0.14em]' : 'text-[11px] tracking-[0.16em]'
                    )}
                  >
                    {row.meta}
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ObservabilitySelectableRowsOrDetails({
  rows,
  selectedKey,
  onSelect,
  selectionAttrName,
  tone = 'deck',
}: {
  rows: ObservabilitySelectableRow[];
  selectedKey?: string | null;
  onSelect: (key: string) => void;
  selectionAttrName?: string;
  tone?: 'deck' | 'operator';
}) {
  if (rows.length === 0) return null;
  if (rows.every(row => row.key === 'empty')) {
    return <ObservabilityDetailRows rows={rows} tone={tone} />;
  }

  return (
    <ObservabilitySelectableRows
      rows={rows.filter(row => row.key !== 'empty')}
      selectedKey={selectedKey}
      onSelect={onSelect}
      selectionAttrName={selectionAttrName}
      tone={tone}
    />
  );
}
