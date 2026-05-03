'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export type RailNavItem = {
  label: string;
  href?: string;
  active?: boolean;
  onSelect?: () => void;
};

export function RailNav({
  items,
  compact = false,
  className
}: {
  items: RailNavItem[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <nav className={cn('space-y-1.5', className)} data-observability-rail-nav="true">
      {items.map(item =>
        item.href ? (
          <a
            key={`${item.label}-${item.href}`}
            className={cn(
              'flex min-h-8 items-center rounded-[2px] border px-3 text-[12px] transition-colors',
              compact ? 'py-1.5' : 'py-2',
              item.active
                ? 'border-[var(--ops-primary)] bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)]'
                : 'border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-secondary)] hover:border-[var(--ops-primary)] hover:text-[var(--ops-text-primary)]'
            )}
            href={item.href}
          >
            {item.label}
          </a>
        ) : (
          <button
            key={item.label}
            className={cn(
              'flex min-h-8 w-full items-center rounded-[2px] border px-3 text-left text-[12px] transition-colors',
              compact ? 'py-1.5' : 'py-2',
              item.active
                ? 'border-[var(--ops-primary)] bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)]'
                : 'border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-secondary)] hover:border-[var(--ops-primary)] hover:text-[var(--ops-text-primary)]'
            )}
            type="button"
            onClick={item.onSelect}
          >
            {item.label}
          </button>
        )
      )}
    </nav>
  );
}
