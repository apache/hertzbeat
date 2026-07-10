'use client';

import Link from 'next/link';
import * as React from 'react';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';
import { WorkbenchPanel } from '../../components/workbench/primitives';
import { Badge } from '../ui/badge';
import { buttonVariants } from '../ui/button';
import { cn } from '../../lib/utils';

type Tone = 'default' | 'success' | 'warning' | 'danger';

export type OverviewStatusItem = {
  key: string;
  label: string;
  value: string;
  ready: boolean;
};

export type OverviewSummaryItem = {
  key: string;
  label: string;
  value: string;
  hint: string;
  delta: string;
  tone: Tone;
};

export type OverviewQuickEntryItem = {
  label: string;
  copy: string;
  route: string;
};

export type OverviewImpactedItem = {
  name: string;
  type: string;
  severity: string;
  severityLabel: string;
  severityTone: Tone;
  owner: string;
  statusLabel: string;
  lastIssue: string;
};

export type OverviewWorkspaceFact = {
  label: string;
  value: string;
};

export type OverviewTrendItem = {
  label: string;
  value: string;
  insight: string;
  tone: Tone;
};

export type OverviewCoverageItem = {
  label: string;
  total: string;
  healthy: string;
  abnormal: string;
};

export type OverviewChecklistItem = {
  key: string;
  label: string;
  ready: boolean;
};

export type OverviewGuidanceReason = {
  label: string;
  value: string;
};

export type OverviewGuidanceLink = {
  label: string;
  description?: string;
  href: string;
};

export type OverviewActivityItem = {
  title: string;
  detail?: string;
  timestamp?: string;
  tone?: Tone;
  tag?: string;
};

function toneTextClass(tone: Tone) {
  switch (tone) {
    case 'success':
      return 'text-[var(--ops-success)]';
    case 'warning':
      return 'text-[var(--ops-warning)]';
    case 'danger':
      return 'text-[var(--ops-critical)]';
    default:
      return 'text-[var(--ops-text-primary)]';
  }
}

function timelineDotClass(tone: Tone) {
  switch (tone) {
    case 'success':
      return 'bg-[var(--ops-success)]';
    case 'warning':
      return 'bg-[var(--ops-warning)]';
    case 'danger':
      return 'bg-[var(--ops-critical)]';
    default:
      return 'bg-[var(--ops-primary)]';
  }
}

const DEFAULT_OVERVIEW_GUIDANCE_START_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['overview.guidance.default.start'] ?? 'overview.guidance.default.start';
const DEFAULT_OVERVIEW_GUIDANCE_REASONS_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['overview.guidance.default.reasons'] ?? 'overview.guidance.default.reasons';
const DEFAULT_OVERVIEW_GUIDANCE_NEXT_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['overview.guidance.default.next'] ?? 'overview.guidance.default.next';
const OVERVIEW_CHECKLIST_READY_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['overview.checklist.status.ready'] ?? 'overview.checklist.status.ready';
const OVERVIEW_CHECKLIST_PENDING_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['overview.checklist.status.pending'] ?? 'overview.checklist.status.pending';

export function OverviewStatusGrid({
  title,
  description,
  items,
  action,
  density = 'default'
}: {
  title: string;
  description: string;
  items: OverviewStatusItem[];
  action?: React.ReactNode;
  density?: 'default' | 'compact';
}) {
  return (
    <WorkbenchPanel as="article" variant="flat" data-overview-status-grid="true">
      <div className="grid gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-tertiary)]">{title}</div>
        <div className="text-[12px] leading-[1.45] text-[var(--ops-text-secondary)]">{description}</div>
      </div>
      <div
        className={cn(
          'grid gap-2',
          density === 'compact' ? 'mt-2 sm:grid-cols-4 sm:gap-x-4' : 'mt-3 sm:grid-cols-2'
        )}
        data-overview-status-list="true"
        data-overview-status-density={density}
      >
        {items.map((item, index) => (
          <div
            key={item.key}
            className={cn(
              'grid gap-1 border-t border-[var(--ops-border-color)] px-0 py-2',
              density === 'default' && index < 2 && 'border-t-0 pt-0',
              item.ready && 'border-[var(--ops-primary)]'
            )}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ops-text-tertiary)]">{item.label}</div>
            <div className="text-[14px] font-semibold text-[var(--ops-text-primary)]">{item.value}</div>
          </div>
        ))}
      </div>
      {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
    </WorkbenchPanel>
  );
}

export function OverviewSummaryGrid({
  items,
  onSelect
}: {
  items: OverviewSummaryItem[];
  onSelect?: (item: OverviewSummaryItem) => void;
}) {
  return (
    <section className="grid gap-2 md:grid-cols-3" data-overview-summary-grid="true">
      {items.map(item => {
        const content = (
          <>
            <div className="text-[12px] font-semibold text-[var(--ops-text-primary)]">{item.label}</div>
            <div className={cn('text-[22px] font-semibold leading-none', toneTextClass(item.tone))}>{item.value}</div>
            <div className="text-[11px] leading-[1.45] text-[var(--ops-text-secondary)]">{item.hint}</div>
            <div className="border-t border-[var(--ops-border-color)] pt-2 text-[11px] font-medium text-[var(--ops-text-primary)]">{item.delta}</div>
          </>
        );

        if (onSelect) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item)}
              data-overview-summary-item="true"
              data-overview-summary-item-chrome="flat"
              className="grid w-full gap-2 border-t border-[var(--ops-border-color)] px-0 py-3 text-left transition-colors hover:text-[var(--ops-text-primary)]"
            >
              {content}
            </button>
          );
        }

        return (
          <article
            key={item.key}
            data-overview-summary-item="true"
            data-overview-summary-item-chrome="flat"
            className="grid gap-2 border-t border-[var(--ops-border-color)] px-0 py-3"
          >
            {content}
          </article>
        );
      })}
    </section>
  );
}

export function OverviewQuickEntryGrid({
  kicker,
  title,
  items
}: {
  kicker: string;
  title: string;
  items: OverviewQuickEntryItem[];
}) {
  return (
    <WorkbenchPanel as="article" variant="flat" data-overview-quick-links="true">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-tertiary)]">{kicker}</div>
      <div className="mt-1 text-[13px] font-semibold text-[var(--ops-text-primary)]">{title}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item, index) => (
          <Link
            key={`${item.route}-${index}`}
            href={item.route}
            className={cn(
              'grid gap-1 border-t border-[var(--ops-border-color)] py-2 text-left transition-colors hover:text-[var(--ops-text-primary)]',
              index < 2 && 'border-t-0 pt-0'
            )}
          >
            <span className="text-[12px] font-semibold text-[var(--ops-text-primary)]">{item.label}</span>
            <span className="text-[11px] leading-[1.45] text-[var(--ops-text-secondary)]">{item.copy}</span>
          </Link>
        ))}
      </div>
    </WorkbenchPanel>
  );
}

export function OverviewImpactedList({
  kicker,
  title,
  action,
  items,
  baseHref = '/entities',
  onOpenItem
}: {
  kicker: string;
  title: string;
  action?: React.ReactNode;
  items: OverviewImpactedItem[];
  baseHref?: string;
  onOpenItem?: (item: OverviewImpactedItem) => void;
}) {
  return (
    <WorkbenchPanel as="article" variant="flat" data-overview-impacted="true">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-tertiary)]">{kicker}</div>
          <div className="mt-1 text-[13px] font-semibold text-[var(--ops-text-primary)]">{title}</div>
        </div>
        {action}
      </div>
      <div className="mt-3 grid gap-1.5">
        {items.map((item, index) => {
          const content = (
            <>
              <span className="grid gap-1">
                <span className="text-[13px] font-semibold text-[var(--ops-text-primary)]">{item.name}</span>
                <span className="text-[12px] text-[var(--ops-text-secondary)]">{item.type} · {item.owner}</span>
              </span>
              <span className="grid justify-items-end gap-1">
                <span
                  className={cn('text-[12px] font-semibold uppercase', toneTextClass(item.severityTone))}
                  data-overview-impacted-severity-tone={item.severityTone}
                >
                  {item.severityLabel}
                </span>
                <span className="text-[12px] text-[var(--ops-text-secondary)]">{item.statusLabel}</span>
              </span>
            </>
          );

          const itemClassName = cn(
            'flex items-start justify-between gap-4 border-t border-[var(--ops-border-color)] py-2 text-left transition-colors hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)]',
            index === 0 && 'border-t-0 pt-0'
          );

          if (onOpenItem) {
            return (
              <button
                key={`${item.name}-${index}`}
                type="button"
                onClick={() => onOpenItem(item)}
                className={cn(itemClassName, 'w-full cursor-pointer bg-transparent')}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={`${item.name}-${index}`}
              href={`${baseHref}?app=${encodeURIComponent(item.name)}`}
              className={itemClassName}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </WorkbenchPanel>
  );
}

export function OverviewGuidancePanel({
  headline,
  description,
  primaryAction,
  secondaryAction,
  reasons,
  nextLinks,
  density = 'default',
  compactReasons = false,
  reasonDensity = 'default',
  startLabel = DEFAULT_OVERVIEW_GUIDANCE_START_LABEL,
  reasonsLabel = DEFAULT_OVERVIEW_GUIDANCE_REASONS_LABEL,
  nextLabel = DEFAULT_OVERVIEW_GUIDANCE_NEXT_LABEL
}: {
  headline: string;
  description: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  reasons: OverviewGuidanceReason[];
  nextLinks: OverviewGuidanceLink[];
  density?: 'default' | 'compact';
  compactReasons?: boolean;
  reasonDensity?: 'default' | 'compact';
  startLabel?: string;
  reasonsLabel?: string;
  nextLabel?: string;
}) {
  return (
    <WorkbenchPanel
      as="article"
      variant="flat"
      className={cn('grid', density === 'compact' ? 'gap-2 pt-2' : 'gap-3 pt-3')}
      data-overview-guidance="true"
      data-overview-guidance-density={density}
    >
      <div className={cn('grid', density === 'compact' ? 'gap-1.5' : 'gap-2')}>
        <div
          className={cn(
            'font-semibold uppercase text-[var(--ops-text-tertiary)]',
            density === 'compact' ? 'text-[9px] tracking-[0.14em]' : 'text-[10px] tracking-[0.18em]'
          )}
        >
          {startLabel}
        </div>
        <div
          className={cn(
            'font-semibold text-[var(--ops-text-primary)]',
            density === 'compact' ? 'text-[14px] leading-[1.2]' : 'text-[15px]'
          )}
        >
          {headline}
        </div>
        <div
          className={cn(
            'text-[var(--ops-text-secondary)]',
            density === 'compact' ? 'text-[11px] leading-[1.4]' : 'text-[12px] leading-[1.5]'
          )}
        >
          {description}
        </div>
      </div>

      {(primaryAction || secondaryAction) ? (
        <div className={cn('flex flex-wrap', density === 'compact' ? 'gap-1.5' : 'gap-2')}>
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}

      {reasons.length > 0 ? (
        <div
          className={cn(
            'grid border-t border-[var(--ops-border-color)]',
            density === 'compact' ? 'gap-1.5 pt-2' : 'gap-2 pt-3'
          )}
        >
          <div
            className={cn(
              'font-semibold uppercase text-[var(--ops-text-tertiary)]',
              density === 'compact' ? 'text-[9px] tracking-[0.14em]' : 'text-[10px] tracking-[0.18em]'
            )}
          >
            {reasonsLabel}
          </div>
          <div
            className={cn(
              compactReasons
                ? reasonDensity === 'compact'
                  ? 'flex flex-wrap gap-1 sm:flex-nowrap sm:gap-1'
                  : 'flex flex-wrap gap-2'
                : 'grid gap-2 sm:grid-cols-3'
            )}
            data-overview-guidance-reasons-layout={compactReasons ? 'pill-row' : 'grid'}
            data-overview-guidance-reasons-density={reasonDensity}
          >
            {reasons.map((reason, index) => (
              compactReasons ? (
                <div
                  key={`reason-${index}`}
                  data-overview-guidance-reason-chip-style={reasonDensity === 'compact' ? 'dense-fact' : 'pill'}
                  className={cn(
                    'inline-flex items-center whitespace-nowrap border border-[var(--ops-border-color)]',
                    reasonDensity === 'compact'
                      ? 'min-h-[28px] min-w-[64px] gap-1 rounded-[9px] bg-[var(--ops-surface-panel)] px-1.5 py-1 text-[var(--ops-text-secondary)] sm:min-w-0 sm:flex-1 sm:justify-between'
                      : 'min-w-[84px] shrink-0 gap-2 rounded-full bg-[var(--ops-surface-panel)] px-3 py-1.5'
                  )}
                >
                  <div
                    data-overview-guidance-reason-label-style={reasonDensity === 'compact' ? 'inline-fact' : 'pill-kicker'}
                    className={cn(
                      'font-semibold',
                      reasonDensity === 'compact'
                        ? 'text-[10px] leading-[1.25] text-inherit'
                        : 'uppercase text-[10px] tracking-[0.08em] text-[var(--ops-text-tertiary)]'
                    )}
                  >
                    {reason.label}
                  </div>
                  <div
                    data-overview-guidance-reason-value-style={reasonDensity === 'compact' ? 'dense-fact' : 'pill-value'}
                    className={cn(
                      'font-semibold text-[var(--ops-text-primary)]',
                      reasonDensity === 'compact'
                        ? 'text-[12px] leading-none'
                        : 'text-[12px]'
                    )}
                  >
                    {reason.value}
                  </div>
                </div>
              ) : (
                <div
                  key={`reason-${index}`}
                  className="grid gap-1 border-t border-[var(--ops-border-color)] px-0 py-2"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-tertiary)]">{reason.label}</div>
                  <div className="text-[13px] font-semibold text-[var(--ops-text-primary)]">{reason.value}</div>
                </div>
              )
            ))}
          </div>
        </div>
      ) : null}

      {nextLinks.length > 0 ? (
        <div
          className={cn(
            'grid border-t border-[var(--ops-border-color)]',
            density === 'compact' ? 'gap-1.5 pt-2' : 'gap-2 pt-3'
          )}
        >
          <div
            className={cn(
              'font-semibold uppercase text-[var(--ops-text-tertiary)]',
              density === 'compact' ? 'text-[9px] tracking-[0.14em]' : 'text-[10px] tracking-[0.18em]'
            )}
          >
            {nextLabel}
          </div>
          <div className="grid gap-2">
            {nextLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="grid gap-0.5 border-t border-[var(--ops-border-color)] px-0 py-2 transition-colors hover:border-[var(--ops-primary)]"
              >
                <span className="text-[12px] font-semibold text-[var(--ops-text-primary)]">{link.label}</span>
                {link.description ? <span className="text-[11px] leading-[1.45] text-[var(--ops-text-secondary)]">{link.description}</span> : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </WorkbenchPanel>
  );
}

export function OverviewChecklist({
  title,
  items,
  readyLabel = OVERVIEW_CHECKLIST_READY_LABEL,
  pendingLabel = OVERVIEW_CHECKLIST_PENDING_LABEL,
  density = 'default'
}: {
  title: string;
  items: OverviewChecklistItem[];
  readyLabel?: string;
  pendingLabel?: string;
  density?: 'default' | 'compact';
}) {
  return (
    <WorkbenchPanel as="article" variant="flat" data-overview-checklist="true" data-overview-checklist-density={density}>
      <div
        className={cn(
          'font-semibold uppercase text-[var(--ops-text-tertiary)]',
          density === 'compact' ? 'text-[10px] tracking-[0.14em]' : 'text-[11px] tracking-[0.08em]'
        )}
      >
        {title}
      </div>
      <div className={cn('grid sm:grid-cols-2', density === 'compact' ? 'mt-1.5 gap-1 sm:gap-x-3' : 'mt-3 gap-2')}>
        {items.map(item => (
          <div
            key={item.key}
            className={cn(
              'grid border-t border-[var(--ops-border-color)] first:border-t-0 first:pt-0',
              density === 'compact' ? 'gap-0 py-1' : 'gap-1 py-2'
            )}
          >
            <div
              className={cn(
                'font-semibold text-[var(--ops-text-primary)]',
                density === 'compact' ? 'text-[10px] leading-[1.25]' : 'text-[12px]'
              )}
            >
              {item.label}
            </div>
            <div
              className={cn(
                'text-[var(--ops-text-secondary)]',
                density === 'compact' ? 'text-[9px] leading-[1.2]' : 'text-[11px] leading-[1.45]'
              )}
            >
              {item.ready ? readyLabel : pendingLabel}
            </div>
          </div>
        ))}
      </div>
    </WorkbenchPanel>
  );
}

export function OverviewWorkspaceFacts({ items }: { items: OverviewWorkspaceFact[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" data-overview-facts="true">
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={cn('grid gap-1 border-t border-[var(--ops-border-color)] py-2', index < 2 && 'border-t-0 pt-0')}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ops-text-tertiary)]">{item.label}</div>
          <div className="text-[18px] font-semibold leading-[1.15] text-[var(--ops-text-primary)]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function OverviewTrendList({ items }: { items: OverviewTrendItem[] }) {
  return (
    <div className="grid gap-2" data-overview-trends="true">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className={cn('grid gap-1 border-t border-[var(--ops-border-color)] py-2', index === 0 && 'border-t-0 pt-0')}>
          <div className="flex items-start justify-between gap-3">
            <div className="text-[12px] font-semibold text-[var(--ops-text-primary)]">{item.label}</div>
            <div className={cn('text-[18px] font-semibold leading-none', toneTextClass(item.tone))}>{item.value}</div>
          </div>
          <div className="text-[12px] leading-[1.45] text-[var(--ops-text-secondary)]">{item.insight}</div>
        </div>
      ))}
    </div>
  );
}

export function OverviewCoverageList({ title, items }: { title: string; items: OverviewCoverageItem[] }) {
  return (
    <div className="grid gap-2 border-t border-[var(--ops-border-color)] pt-3" data-overview-coverage="true">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-tertiary)]">{title}</div>
      <div className="grid gap-1.5">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className={cn('flex items-start justify-between gap-4 border-t border-[var(--ops-border-color)] py-2', index === 0 && 'border-t-0 pt-0')}>
            <div className="grid gap-0.5">
              <div className="text-[12px] font-semibold text-[var(--ops-text-primary)]">{item.label}</div>
              <div className="text-[11px] text-[var(--ops-text-secondary)]">{item.total}</div>
            </div>
            <div className="grid justify-items-end gap-0.5 text-right">
              <div className="text-[11px] text-[var(--ops-text-secondary)]">{item.healthy}</div>
              <div className="text-[11px] text-[var(--ops-warning)]">{item.abnormal}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverviewActivityTimeline({
  title,
  items,
  emptyText
}: {
  title: string;
  items: OverviewActivityItem[];
  emptyText: string;
}) {
  return (
    <WorkbenchPanel as="article" variant="flat" data-overview-activity="true">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-tertiary)]">{title}</div>
      {items.length === 0 ? (
        <div className="mt-3 border-t border-[var(--ops-border-color)] px-0 py-3 text-[12px] text-[var(--ops-text-secondary)]">{emptyText}</div>
      ) : (
        <ol className="mt-3 grid gap-2">
          {items.map((item, index) => {
            const tone = item.tone || 'default';
            return (
              <li key={`${item.title}-${index}`} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
                <div className="relative flex justify-center">
                  {index < items.length - 1 ? <span className="absolute inset-y-3 w-px bg-[var(--ops-border-color)]" /> : null}
                  <span className={cn('mt-1.5 h-2.5 w-2.5 rounded-full', timelineDotClass(tone))} />
                </div>
                <div className="border-t border-[var(--ops-border-color)] px-0 py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="text-[12px] font-semibold text-[var(--ops-text-primary)]">{item.title}</div>
                    {item.tag ? <Badge variant={tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : tone === 'warning' ? 'accent' : 'default'}>{item.tag}</Badge> : null}
                  </div>
                  {item.detail ? <div className="mt-1 text-[12px] leading-[1.45] text-[var(--ops-text-secondary)]">{item.detail}</div> : null}
                  {item.timestamp ? <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--ops-text-tertiary)]">{item.timestamp}</div> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </WorkbenchPanel>
  );
}

export function OverviewSectionAction({
  label,
  href,
  onClick,
  variant = 'default',
  className
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'subtle';
  className?: string;
}) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(buttonVariants({ variant, size: 'sm' }), className)}>
        {label}
      </button>
    );
  }

  if (!href) {
    return null;
  }

  return (
    <Link href={href} className={cn(buttonVariants({ variant, size: 'sm' }), className)}>
      {label}
    </Link>
  );
}
