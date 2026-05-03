'use client';

import React from 'react';

export function ObservabilityDisclosure({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-[var(--ops-text-secondary)] transition hover:bg-[var(--ops-surface-raised)] hover:text-[var(--ops-text-primary)]">
        {title}
      </summary>
      <div className="border-t border-[var(--ops-border-color)] p-3 text-[var(--ops-text-secondary)]">{children}</div>
    </details>
  );
}
