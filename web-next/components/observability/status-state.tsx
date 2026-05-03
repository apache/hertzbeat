'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export function ObservabilityStatusState({
  title,
  copy,
  tone = 'default'
}: {
  title: string;
  copy: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <section
      className={cn(
        'rounded-[6px] border border-dashed px-4 py-4',
        tone === 'danger'
          ? 'border-[rgba(216,111,91,0.28)] bg-[rgba(216,111,91,0.08)]'
          : 'border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]'
      )}
    >
      <div className="text-[15px] font-semibold text-[var(--ops-text-primary)]">{title}</div>
      <div className="mt-1.5 text-[13px] leading-5.5 text-[var(--ops-text-secondary)]">{copy}</div>
    </section>
  );
}
