'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type SelectableEvidenceRow = {
  key: string;
  title: string;
  copy: string;
  meta?: string;
  extra?: ReactNode;
};

export function SelectableEvidenceList({
  rows,
  selectedKey,
  onSelect
}: {
  rows: SelectableEvidenceRow[];
  selectedKey?: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="grid gap-0">
      {rows.map(row => {
        const active = row.key === selectedKey;
        return (
          <div
            key={row.key}
            className={cn(
              'group rounded-[0] border-x-0 border-t-0 px-3 py-2 transition-colors duration-150 first:rounded-t-[2px] last:rounded-b-[2px] last:border-b',
              active
                ? 'border-[var(--ops-border-color)] bg-[var(--ops-surface-elevated)] shadow-[inset_2px_0_0_var(--ops-primary)]'
                : 'border-[var(--ops-border-color)] bg-transparent hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)]'
            )}
          >
            <button
              type="button"
              className="grid w-full gap-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.2)]"
              onClick={() => onSelect(row.key)}
            >
              <div className="text-[13px] font-medium text-[var(--ops-text-primary)] transition group-hover:text-[var(--ops-text-primary)]">{row.title}</div>
              <div className="text-[12px] leading-5 text-[var(--ops-text-secondary)]">{row.copy}</div>
              {row.meta ? <div className="text-[10px] leading-4 uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">{row.meta}</div> : null}
            </button>
            {row.extra ? <div className="pt-2">{row.extra}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
