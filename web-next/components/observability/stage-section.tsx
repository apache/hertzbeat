'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { ObservabilityPanelShell } from './panel-shell';

export type StageMetaItem = {
  label: string;
  value: string;
};

export function StageMetaHeader({
  title,
  description,
  metaItems = [],
  actions,
  className
}: {
  title: string;
  description?: string;
  metaItems?: StageMetaItem[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col gap-3 border-b border-[var(--ops-border-color)] pb-3', className)}
      data-observability-stage-meta-header="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[var(--ops-text-primary)]">{title}</div>
          {description ? <div className="mt-1 text-[12px] leading-5 text-[var(--ops-text-secondary)]">{description}</div> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {metaItems.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {metaItems.map(item => (
            <span
              key={`${item.label}-${item.value}`}
              className="inline-flex items-center gap-1 rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2 py-1 text-[11px] text-[var(--ops-text-secondary)]"
            >
              <span className="uppercase tracking-[0.12em] text-[var(--ops-text-tertiary)]">{item.label}</span>
              <span className="text-[var(--ops-text-primary)]">{item.value}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function StageSection({
  title,
  description,
  children,
  actions,
  compact = false,
  tone = 'operator',
  chrome = 'default',
  className
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
  tone?: 'default' | 'deck' | 'operator';
  chrome?: 'default' | 'plain';
  className?: string;
}) {
  return (
    <div data-observability-stage-section="true">
      <ObservabilityPanelShell
        title={title}
        description={description}
        actions={actions}
        tone={tone}
        variant={chrome === 'plain' ? 'flat' : 'default'}
        className={className}
        contentClassName={cn(compact ? 'space-y-3' : 'space-y-4')}
      >
        {children}
      </ObservabilityPanelShell>
    </div>
  );
}
