'use client';

import React, { type ReactNode } from 'react';
import { ObservabilityPageHeader, ObservabilityStatGrid, ObservabilityWaterfall } from '../observability';
import { cn } from '../../lib/utils';
import { WorkspaceTabStrip, type WorkspaceShellTab } from './workspace-tab-strip';

type Fact = { label: string; value: string };
type Row = { title: string; copy: string; meta?: string };

export function WorkbenchPage(props: {
  kicker: string;
  kickerVariant?: 'badge' | 'plain';
  title: string;
  subtitle: string;
  facts: Fact[];
  actions?: ReactNode;
  factsVariant?: 'grid' | 'pills';
  tone?: 'default' | 'deck' | 'operator';
  tabs?: WorkspaceShellTab[];
  main: ReactNode;
  side?: ReactNode;
}) {
  const { kicker, kickerVariant, title, subtitle, facts, actions, factsVariant = 'grid', tone = 'default', tabs = [], main, side } = props;
  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        <ObservabilityPageHeader
          kicker={kicker}
          kickerVariant={kickerVariant}
          title={title}
          subtitle={subtitle}
          facts={facts}
          factsVariant={factsVariant}
          actions={actions}
          tone={tone}
        />
        <WorkspaceTabStrip tabs={tabs} className={cn(tone === 'operator' ? '-mt-1' : '')} />
      </div>
      <section className={cn('grid gap-3', side ? 'xl:grid-cols-[minmax(0,1.6fr)_360px]' : '')}>
        <div className="space-y-3">{main}</div>
        {side ? <aside className="space-y-3">{side}</aside> : null}
      </section>
    </div>
  );
}

export function RowList({ rows }: { rows: Row[] }) {
  return (
    <div className="divide-y divide-[var(--ops-border-color)]">
      {rows.map((row, index) => (
        <div className="space-y-0.5 py-1.5 first:pt-0 last:pb-0" key={`${row.title}-${row.meta ?? ''}-${index}`}>
          <div className="text-[13px] font-medium text-[var(--ops-text-primary)]">{row.title}</div>
          <div className="text-[12px] leading-[1.35rem] text-[var(--ops-text-secondary)]">{row.copy}</div>
          {row.meta ? <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--ops-text-tertiary)]">{row.meta}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function MetricGrid({ items }: { items: Array<{ label: string; value: string; tone?: string }> }) {
  return <ObservabilityStatGrid items={items.map(item => ({ label: item.label, value: item.value }))} />;
}

export function WaterfallDemo() {
  const rows = [
    { title: 'POST /checkout', duration: '842ms', start: 0, width: 88, danger: false },
    { title: 'payment.validate', duration: '133ms', start: 8, width: 14, danger: false },
    { title: 'db.query orders', duration: '412ms', start: 22, width: 46, danger: true },
    { title: 'inventory.reserve', duration: '176ms', start: 70, width: 18, danger: false }
  ];

  return (
    <ObservabilityWaterfall
      rows={rows.map(row => ({
        key: row.title,
        title: row.title,
        subtitle: `Start ${row.start}%`,
        durationLabel: row.duration,
        leftPct: row.start,
        widthPct: row.width,
        tone: row.danger ? 'danger' : 'default'
      }))}
    />
  );
}
