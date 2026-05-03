'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export function ObservabilityRailShell({
  title,
  children,
  tone = 'default',
  variant = 'default',
  className = ''
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'default' | 'deck';
  variant?: 'default' | 'flat';
  className?: string;
}) {
  return (
    <section
      className={cn(
        tone === 'deck'
          ? 'rounded-[10px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-elevated)] px-3.5 py-3 shadow-none'
          : 'rounded-[10px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3 py-2.5 shadow-none',
        variant === 'flat' && 'rounded-none border-x-0 border-b-0 border-t bg-transparent px-0 py-0 shadow-none',
        className
      )}
    >
      <div
        className={cn(
          tone === 'deck'
            ? 'mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-tertiary)]'
            : 'mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]',
          variant === 'flat' && 'mb-2 pt-3'
        )}
      >
        {title}
      </div>
      {children}
    </section>
  );
}
