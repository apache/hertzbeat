'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { ObservabilityPanelShell } from './panel-shell';

export type SupportActionBarItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
};

export function SupportActionBar({
  items,
  className
}: {
  items: SupportActionBarItem[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} data-observability-support-action-bar="true">
      {items.map(item =>
        item.href ? (
          <a
            key={`${item.label}-${item.href}`}
            className="inline-flex min-h-8 items-center rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3 text-[12px] text-[var(--ops-text-primary)]"
            href={item.href}
          >
            {item.label}
          </a>
        ) : (
          <button
            key={item.label}
            className="inline-flex min-h-8 items-center rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3 text-[12px] text-[var(--ops-text-primary)]"
            type="button"
            onClick={item.onSelect}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

export function SupportPanel({
  title,
  subtitle,
  children,
  actionLabel,
  expanded = false,
  tone = 'operator',
  chrome = 'plain',
  className
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actionLabel?: string;
  expanded?: boolean;
  tone?: 'default' | 'deck' | 'operator';
  chrome?: 'default' | 'plain';
  className?: string;
}) {
  return (
    <div data-observability-support-panel="true">
      <ObservabilityPanelShell
        title={title}
        description={subtitle}
        tone={tone}
        variant={chrome === 'plain' ? 'flat' : 'default'}
        className={className}
        contentClassName={cn('space-y-3', expanded && 'pt-1')}
        actions={
          actionLabel ? (
            <span className="inline-flex items-center rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2 py-1 text-[11px] text-[var(--ops-text-tertiary)]">
              {actionLabel}
            </span>
          ) : undefined
        }
      >
        {children}
      </ObservabilityPanelShell>
    </div>
  );
}
