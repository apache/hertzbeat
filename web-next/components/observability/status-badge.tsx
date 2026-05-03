'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export function ObservabilityStatusBadge({
  label,
  tone = 'default'
}: {
  label: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const className = cn(
    tone === 'danger'
      ? 'border-[rgba(216,111,91,0.28)] bg-[rgba(216,111,91,0.08)] text-[var(--ops-text-primary)]'
      : tone === 'success'
        ? 'border-[rgba(76,183,130,0.24)] bg-[rgba(76,183,130,0.08)] text-[var(--ops-text-primary)]'
        : 'border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] text-[var(--ops-text-secondary)]'
  );

  return (
    <div className={cn('inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]', className)}>
      {label}
    </div>
  );
}
