'use client';

import * as React from 'react';
import { ObservabilityStatusState, ObservabilityWaterfall, type ObservabilityWaterfallTick } from '../observability';
import { SelectableEvidenceList } from '../observability/selectable-evidence-list';
import { RowList } from '../workbench/workbench-page';
import { OverlayDialog } from '../workbench/overlay-dialog';

type EvidenceRow = {
  key: string;
  title: string;
  copy: string;
  detailLabel?: string;
  meta?: string;
  durationLabel?: string;
  offsetLabel?: string;
  leftPct?: number;
  widthPct?: number;
  depth?: number;
  tone?: 'default' | 'danger';
  events?: Array<{
    key: string;
    label: string;
    leftPct: number;
    tone?: 'default' | 'danger';
    offsetLabel?: string;
    attributesLabel?: string;
  }>;
};

type SelectedTraceEvent = {
  row: EvidenceRow;
  event: NonNullable<EvidenceRow['events']>[number];
};

type FactRow = {
  title: string;
  copy: string;
  meta?: string;
};

type StageFact = {
  label: string;
  value: string;
  tone?: 'default' | 'accent' | 'error';
};

function findSelectedTraceEvent(rows: EvidenceRow[], selectedEventKey?: string | null): SelectedTraceEvent | null {
  if (!selectedEventKey) return null;
  for (const row of rows) {
    const event = row.events?.find(item => item.key === selectedEventKey);
    if (event) return { row, event };
  }
  return null;
}

function buildSelectedTraceEventFacts(selection: SelectedTraceEvent): FactRow[] {
  const { row, event } = selection;
  return [
    {
      title: '跨度事件',
      copy: event.label || '未命名事件',
      meta: '不是新的跨度，是当前跨度上的时间点'
    },
    {
      title: '所属跨度',
      copy: row.title || row.key,
      meta: row.detailLabel || row.copy
    },
    {
      title: '事件位置',
      copy: event.offsetLabel || `${Math.round(event.leftPct)}%`,
      meta: '相对链路时间轴'
    },
    {
      title: '事件属性',
      copy: event.attributesLabel || '无属性',
      meta: 'attributes'
    }
  ];
}

export function LogRelatedTraceDialog({
  open,
  onClose,
  title,
  subtitle,
  stageMeta = [],
  badges = [],
  metaItems = [],
  headerAction,
  loading = false,
  error,
  rows,
  selectedKey,
  selectedEventKey,
  onSelect,
  onSelectEvent,
  stageFacts = [],
  timelineTicks = [],
  selectedFacts,
  emptyTitle = 'No Related Traces',
  emptyCopy = 'No related trace preview is available yet.',
  loadingTitle = 'Loading trace preview',
  loadingCopy = 'Loading trace preview from the current log context.',
  spanLabel = 'Span',
  durationLabel = 'Duration',
  timelineLabel = 'Timeline'
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  stageMeta?: string[];
  badges?: string[];
  metaItems?: string[];
  headerAction?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  rows: EvidenceRow[];
  selectedKey?: string | null;
  selectedEventKey?: string | null;
  onSelect: (key: string) => void;
  onSelectEvent?: (eventKey: string | null, rowKey?: string) => void;
  stageFacts?: StageFact[];
  timelineTicks?: ObservabilityWaterfallTick[];
  selectedFacts: FactRow[];
  emptyTitle?: string;
  emptyCopy?: string;
  loadingTitle?: string;
  loadingCopy?: string;
  spanLabel?: string;
  durationLabel?: string;
  timelineLabel?: string;
}) {
  const [internalSelectedEventKey, setInternalSelectedEventKey] = React.useState<string | null>(null);
  const activeSelectedEventKey = selectedEventKey === undefined ? internalSelectedEventKey : selectedEventKey;
  const hasWaterfallRows = rows.some(
    row => typeof row.leftPct === 'number' && typeof row.widthPct === 'number' && typeof row.durationLabel === 'string'
  );
  const selectedTraceEvent = findSelectedTraceEvent(rows, activeSelectedEventKey);
  const activeSelectedFacts = selectedTraceEvent ? buildSelectedTraceEventFacts(selectedTraceEvent) : selectedFacts;
  const selectSpan = React.useCallback(
    (key: string) => {
      setInternalSelectedEventKey(null);
      onSelectEvent?.(null, key);
      onSelect(key);
    },
    [onSelect, onSelectEvent]
  );
  const selectEvent = React.useCallback(
    (eventKey: string, rowKey: string) => {
      setInternalSelectedEventKey(eventKey);
      onSelect(rowKey);
      onSelectEvent?.(eventKey, rowKey);
    },
    [onSelect, onSelectEvent]
  );
  const showSelectedSpan = React.useCallback(() => {
    const rowKey = selectedTraceEvent?.row.key;
    setInternalSelectedEventKey(null);
    onSelectEvent?.(null, rowKey);
  }, [onSelectEvent, selectedTraceEvent?.row.key]);

  return (
    <OverlayDialog
      open={open}
      onClose={onClose}
      kicker="相关链路"
      title={title}
      placement="right"
      maxWidthClassName="max-w-[1120px]"
    >
      <div className="grid gap-4" data-log-related-trace-dialog="true">
        {subtitle ? <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-tertiary)]">{subtitle}</div> : null}
        {stageMeta.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--ops-text-secondary)]" data-log-related-trace-stage-meta="true">
            {stageMeta.map(item => (
              <span key={item} className="whitespace-nowrap">
                {item}
              </span>
            ))}
          </div>
        ) : null}
        {headerAction ? <div className="flex justify-end">{headerAction}</div> : null}
        {badges.length > 0 || metaItems.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2" data-log-related-trace-toolbar="true">
            {badges.map(badge => (
              <span
                key={badge}
                className="rounded-[999px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-secondary)]"
              >
                {badge}
              </span>
            ))}
            {metaItems.map(item => (
              <span key={item} className="text-[11px] text-[var(--ops-text-secondary)]">
                {item}
              </span>
            ))}
          </div>
        ) : null}
        {stageFacts.length > 0 ? (
          <div
            className="flex flex-wrap items-center gap-x-5 gap-y-1 border-y border-[var(--ops-border-color)] py-2 text-[12px]"
            data-log-related-trace-stage-facts="true"
            data-log-related-trace-stage-facts-layout="compact-operator-strip"
          >
            {stageFacts.map(item => (
              <span
                key={`${item.label}:${item.value}`}
                className="inline-flex min-w-0 items-baseline gap-2"
              >
                <span className="text-[11px] text-[var(--ops-text-tertiary)]">{item.label}</span>
                <span
                  className={`max-w-[260px] truncate font-semibold ${
                    item.tone === 'error' ? 'text-[#d8898f]' : item.tone === 'accent' ? 'text-[var(--ops-text-primary)]' : 'text-[var(--ops-text-secondary)]'
                  }`}
                >
                  {item.value}
                </span>
              </span>
            ))}
          </div>
        ) : null}
        {loading ? (
          <ObservabilityStatusState title={loadingTitle} copy={loadingCopy} />
        ) : error ? (
          <ObservabilityStatusState title="Trace detail error" copy={error} tone="danger" />
        ) : rows.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            {hasWaterfallRows ? (
              <ObservabilityWaterfall
                rows={rows.map(row => ({
                  key: row.key,
                  title: row.title,
                  subtitle: row.copy,
                  detailLabel: row.detailLabel,
                  durationLabel: row.durationLabel || row.meta || '-',
                  offsetLabel: row.offsetLabel,
                  leftPct: row.leftPct || 0,
                  widthPct: row.widthPct || 1,
                  depth: row.depth || 0,
                  selected: row.key === (selectedKey || null),
                  tone: row.tone || 'default',
                  events: row.events
                }))}
                spanLabel={spanLabel}
                durationLabel={durationLabel}
                timelineLabel={timelineLabel}
                timelineTicks={timelineTicks}
                selectedEventKey={activeSelectedEventKey}
                onSelect={selectSpan}
                onSelectEvent={selectEvent}
              />
            ) : (
              <SelectableEvidenceList rows={rows} selectedKey={selectedKey || null} onSelect={selectSpan} />
            )}
            <div className="grid gap-3">
              {selectedTraceEvent ? (
                <div
                  data-log-related-trace-event-detail="span-event-detail"
                  className="flex items-center justify-between gap-3 border-b border-[var(--ops-border-color)] pb-2"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--ops-text-tertiary)]">事件详情</p>
                    <p className="mt-1 truncate text-[13px] font-semibold text-[var(--ops-text-primary)]">{selectedTraceEvent.event.label}</p>
                    <p data-log-related-trace-event-detail-copy="span-event-not-span" className="mt-0.5 text-[11px] text-[var(--ops-text-tertiary)]">
                      不是新的跨度，是当前跨度上的时间点
                    </p>
                  </div>
                  <button type="button" className="text-[11px] font-semibold text-[var(--ops-text-secondary)] hover:text-[var(--ops-text-primary)]" onClick={showSelectedSpan}>
                    查看跨度
                  </button>
                </div>
              ) : null}
              <RowList rows={activeSelectedFacts} />
            </div>
          </div>
        ) : (
          <ObservabilityStatusState title={emptyTitle} copy={emptyCopy} />
        )}
      </div>
    </OverlayDialog>
  );
}
