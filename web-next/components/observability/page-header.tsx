'use client';

import React from 'react';
import { Badge } from '../ui/badge';
import { ObservabilityStatGrid, type ObservabilityStatGridItem } from './stat-grid';
import { cn } from '../../lib/utils';

export function ObservabilityPageHeader({
  breadcrumbs,
  kicker,
  kickerVariant = 'badge',
  statusBadge,
  title,
  subtitle,
  facts,
  factsVariant = 'grid',
  actions,
  chrome = 'bordered',
  className,
  tone = 'default',
  density = 'default'
}: {
  breadcrumbs?: React.ReactNode;
  kicker?: string;
  kickerVariant?: 'badge' | 'plain';
  statusBadge?: React.ReactNode;
  title: string;
  subtitle?: string;
  facts?: ObservabilityStatGridItem[];
  factsVariant?: 'grid' | 'pills';
  actions?: React.ReactNode;
  chrome?: 'bordered' | 'plain';
  className?: string;
  tone?: 'default' | 'deck' | 'operator';
  density?: 'default' | 'compact';
}) {
  const plainShellHeader = tone === 'operator' && (chrome === 'plain' || kickerVariant === 'plain');

  return (
    <section
      className={cn(
        density === 'compact' ? 'space-y-2 pb-2' : 'space-y-2.5 pb-4',
        chrome === 'bordered' && 'border-b border-[var(--ops-border-color)]',
        className
      )}
      data-observability-header={tone === 'deck' ? 'hero' : tone === 'operator' ? 'operator-sheet' : undefined}
      data-observability-tone={tone === 'deck' ? 'industrial-flat' : tone === 'operator' ? 'operator-sheet' : undefined}
    >
      {breadcrumbs ? (
        <div
          className={
            tone === 'deck'
              ? 'flex flex-wrap items-center gap-2 text-[11px] text-[var(--ops-text-tertiary)]'
              : tone === 'operator'
                ? 'flex flex-wrap items-center gap-2 text-[11px] text-[var(--ops-text-tertiary)]'
                : 'flex flex-wrap items-center gap-2 text-[11px] text-[var(--ops-text-tertiary)]'
          }
        >
          {breadcrumbs}
        </div>
      ) : null}

      <div className={cn('flex flex-col xl:flex-row xl:items-start xl:justify-between', density === 'compact' ? 'gap-2' : 'gap-3')}>
        <div className={cn('min-w-0 flex-1', density === 'compact' ? 'space-y-1.5' : 'space-y-2')}>
          {(kicker || statusBadge) ? (
            <div className="flex flex-wrap items-center gap-2">
              {kicker ? (
                plainShellHeader ? (
                  <div
                    data-observability-kicker={kickerVariant === 'plain' ? 'plain' : undefined}
                    className="app-page-shell-kicker monitor-detail-workbench-header__kicker text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-tertiary)]"
                  >
                    {kicker}
                  </div>
                ) : (
                  <Badge variant="accent">{kicker}</Badge>
                )
              ) : null}
              {statusBadge}
            </div>
          ) : null}
          <div className="space-y-1">
            <h1
              className={cn(
                tone === 'deck'
                  ? 'text-[22px] font-semibold leading-[1.18] tracking-[-0.02em] text-[var(--ops-text-primary)] sm:text-[24px]'
                  : tone === 'operator'
                    ? cn('text-[22px] font-semibold leading-[1.18] tracking-[-0.02em] text-[var(--ops-text-primary)] sm:text-[24px]', density === 'compact' && 'sm:text-[23px]')
                    : 'text-[22px] font-semibold leading-[1.18] tracking-[-0.02em] text-[var(--ops-text-primary)] sm:text-[24px]',
                plainShellHeader && 'app-page-shell-title monitor-detail-workbench-header__title'
              )}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                className={cn(
                  tone === 'operator'
                    ? cn('max-w-3xl text-[13px] text-[var(--ops-text-secondary)]', density === 'compact' ? 'leading-5' : 'leading-6')
                    : 'max-w-3xl text-[13px] leading-6 text-[var(--ops-text-secondary)]',
                  plainShellHeader && 'app-page-shell-subtitle monitor-detail-workbench-header__copy'
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {facts && facts.length > 0 ? <ObservabilityStatGrid items={facts} columns={4} tone={tone} variant={factsVariant} /> : null}
        </div>

        {actions ? (
          <div
            className={
              tone === 'deck'
                ? 'flex flex-wrap items-center gap-2 xl:max-w-[520px] xl:justify-end xl:self-start'
                : tone === 'operator'
                  ? 'flex flex-wrap items-center gap-2 xl:max-w-[560px] xl:justify-end xl:self-start'
                  : 'flex flex-wrap items-center gap-2 xl:max-w-[420px] xl:justify-end'
            }
          >
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
