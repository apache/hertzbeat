'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { CodePane } from './code-pane';
import { ObservabilityDetailRows, type ObservabilityDetailRow } from './detail-rows';
import { ObservabilityPanelShell } from './panel-shell';

export function DrawerSection({
  title,
  subtitle,
  children,
  expanded = false,
  chrome = 'plain',
  className
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  expanded?: boolean;
  chrome?: 'default' | 'plain';
  className?: string;
}) {
  return (
    <div data-observability-drawer-section="true">
      <ObservabilityPanelShell
        title={title}
        description={subtitle}
        tone="deck"
        variant={chrome === 'plain' ? 'flat' : 'default'}
        className={className}
        contentClassName={cn('space-y-3', expanded && 'pt-1')}
      >
        {children}
      </ObservabilityPanelShell>
    </div>
  );
}

export function DrawerFacts({
  items,
  className
}: {
  items: ObservabilityDetailRow[];
  className?: string;
}) {
  return (
    <div className={className} data-observability-drawer-facts="true">
      <ObservabilityDetailRows rows={items} tone="deck" />
    </div>
  );
}

export type DrawerActionLinkItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
};

export function DrawerActionLinks({
  items,
  className
}: {
  items: DrawerActionLinkItem[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} data-observability-drawer-action-links="true">
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

export function DrawerCodePreview({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} data-observability-drawer-code-preview="true">
      <CodePane>{children}</CodePane>
    </div>
  );
}
