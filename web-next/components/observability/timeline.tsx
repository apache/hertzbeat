'use client';

import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';
import React from 'react';

export type ObservabilityTimelineItem = {
  title: string;
  detail?: string;
  timestamp?: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
};

const TONE_CLASS: Record<NonNullable<ObservabilityTimelineItem['tone']>, string> = {
  info: 'bg-sky-400/70',
  success: 'bg-emerald-400/70',
  warning: 'bg-amber-400/70',
  danger: 'bg-rose-400/70'
};

const DEFAULT_OBSERVABILITY_TIMELINE_EMPTY_TEXT = SUPPLEMENTAL_MESSAGES['en-US']?.['common.timeline.empty'] ?? 'common.timeline.empty';

export function ObservabilityTimeline({
  items,
  emptyText = DEFAULT_OBSERVABILITY_TIMELINE_EMPTY_TEXT
}: {
  items: ObservabilityTimelineItem[];
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <div className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-3 text-sm text-[var(--ops-text-secondary)]">{emptyText}</div>;
  }

  return (
    <ol className="space-y-0">
      {items.map((item, index) => {
        const tone = item.tone || 'info';
        return (
          <li key={`${item.title}-${item.timestamp ?? index}`} className="grid grid-cols-[20px_minmax(0,1fr)] gap-3 pb-3 last:pb-0">
            <div className="relative flex justify-center">
              {index < items.length - 1 ? <div className="absolute top-3 bottom-0 w-px bg-[var(--ops-border-color)]" /> : null}
              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${TONE_CLASS[tone]}`} />
            </div>
            <div className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-2.5">
              <div className="text-sm font-medium text-[var(--ops-text-primary)]">{item.title}</div>
              {item.detail ? <div className="mt-1 text-sm leading-6 text-[var(--ops-text-secondary)]">{item.detail}</div> : null}
              {item.timestamp ? <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--ops-text-tertiary)]">{item.timestamp}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
