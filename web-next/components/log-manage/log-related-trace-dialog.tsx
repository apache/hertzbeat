'use client';

import { useI18n } from '@/components/providers/i18n-provider';
import { SUPPLEMENTAL_MESSAGES } from '@/lib/i18n-runtime-messages';
import { HzActionGroup, HzButton, HzChipGroup, HzDetailRows, HzDialogBodyLayout, HzInlineContextMark, HzStateNotice, HzStatCell, HzStatStrip, HzStatusBadge, type HzStatusTone } from '@hertzbeat/ui';
import * as React from 'react';
import { ObservabilityStatusState, ObservabilityWaterfall, type ObservabilityWaterfallTick } from '../observability';
import { SelectableEvidenceList } from '../observability/selectable-evidence-list';
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

type Translator = (key: string) => string;

function readRelatedTraceDialogDefault(key: string) {
  return SUPPLEMENTAL_MESSAGES['en-US']?.[key] ?? SUPPLEMENTAL_MESSAGES['zh-CN']?.[key] ?? key;
}

function findSelectedTraceEvent(rows: EvidenceRow[], selectedEventKey?: string | null): SelectedTraceEvent | null {
  if (!selectedEventKey) return null;
  for (const row of rows) {
    const event = row.events?.find(item => item.key === selectedEventKey);
    if (event) return { row, event };
  }
  return null;
}

function buildSelectedTraceEventFacts(selection: SelectedTraceEvent, t: Translator): FactRow[] {
  const { row, event } = selection;
  return [
    {
      title: t('log.manage.related-trace.event-fact.title'),
      copy: event.label || t('log.manage.related-trace.event-fact.fallback'),
      meta: t('log.manage.related-trace.event-fact.meta')
    },
    {
      title: t('log.manage.related-trace.event-fact.span'),
      copy: row.title || row.key,
      meta: row.detailLabel || row.copy
    },
    {
      title: t('log.manage.related-trace.event-fact.position'),
      copy: event.offsetLabel || `${Math.round(event.leftPct)}%`,
      meta: t('log.manage.related-trace.event-fact.timeline')
    },
    {
      title: t('log.manage.related-trace.event-fact.attributes'),
      copy: event.attributesLabel || t('log.manage.related-trace.event-fact.no-attributes'),
      meta: 'attributes'
    }
  ];
}

function stageFactTone(tone: StageFact['tone']): HzStatusTone {
  if (tone === 'error') return 'critical';
  if (tone === 'accent') return 'info';
  return 'neutral';
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
  emptyTitle = readRelatedTraceDialogDefault('log.manage.related-trace.empty-title'),
  emptyCopy = readRelatedTraceDialogDefault('log.manage.related-trace.empty-copy'),
  loadingTitle = readRelatedTraceDialogDefault('log.manage.related-trace.loading-title'),
  loadingCopy = readRelatedTraceDialogDefault('log.manage.related-trace.loading-copy'),
  spanLabel = readRelatedTraceDialogDefault('log.manage.related-trace.span-label'),
  durationLabel = readRelatedTraceDialogDefault('log.manage.related-trace.duration-label'),
  timelineLabel = readRelatedTraceDialogDefault('log.manage.related-trace.timeline-label')
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
  const { t } = useI18n();
  const [internalSelectedEventKey, setInternalSelectedEventKey] = React.useState<string | null>(null);
  const activeSelectedEventKey = selectedEventKey === undefined ? internalSelectedEventKey : selectedEventKey;
  const hasWaterfallRows = rows.some(
    row => typeof row.leftPct === 'number' && typeof row.widthPct === 'number' && typeof row.durationLabel === 'string'
  );
  const selectedTraceEvent = findSelectedTraceEvent(rows, activeSelectedEventKey);
  const activeSelectedFacts = selectedTraceEvent ? buildSelectedTraceEventFacts(selectedTraceEvent, t) : selectedFacts;
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
      kicker={t('log.manage.related-trace.kicker')}
      title={title}
      placement="right"
      maxWidthClassName="max-w-[1120px]"
    >
      <HzDialogBodyLayout
        data-log-related-trace-dialog="true"
        data-log-related-trace-dialog-body-owner="hertzbeat-ui-dialog-body-layout"
      >
        {subtitle ? (
          <HzInlineContextMark
            data-log-related-trace-subtitle-owner="hertzbeat-ui-inline-context-mark"
            data-log-related-trace-subtitle="dialog-context"
            active={false}
            className="h-6 max-w-[320px] text-[11px]"
          >
            {subtitle}
          </HzInlineContextMark>
        ) : null}
        {stageMeta.length > 0 ? (
          <HzChipGroup
            data-log-related-trace-stage-meta="true"
            data-log-related-trace-stage-meta-owner="hertzbeat-ui-toolbar-chips"
          >
            {stageMeta.map(item => (
              <HzInlineContextMark
                key={item}
                data-log-related-trace-stage-meta-item-owner="hertzbeat-ui-inline-context-mark"
                active={false}
                className="h-6 max-w-[220px] text-[11px]"
              >
                {item}
              </HzInlineContextMark>
            ))}
          </HzChipGroup>
        ) : null}
        {headerAction ? (
          <HzActionGroup
            data-log-related-trace-header-action-owner="hertzbeat-ui-action-group"
            data-log-related-trace-header-action="full-trace"
            density="inline"
            className="w-full justify-end"
          >
            {headerAction}
          </HzActionGroup>
        ) : null}
        {badges.length > 0 || metaItems.length > 0 ? (
          <HzChipGroup
            data-log-related-trace-toolbar="true"
            data-log-related-trace-toolbar-owner="hertzbeat-ui-toolbar-chips"
          >
            {badges.map(badge => (
              <HzStatusBadge
                key={badge}
                data-log-related-trace-toolbar-badge-owner="hertzbeat-ui-status-badge"
                tone="neutral"
                size="xs"
              >
                {badge}
              </HzStatusBadge>
            ))}
            {metaItems.map(item => (
              <HzInlineContextMark
                key={item}
                data-log-related-trace-toolbar-meta-owner="hertzbeat-ui-inline-context-mark"
                active={false}
                className="h-6 max-w-[260px] text-[11px]"
              >
                {item}
              </HzInlineContextMark>
            ))}
          </HzChipGroup>
        ) : null}
        {stageFacts.length > 0 ? (
          <HzStatStrip
            data-log-related-trace-stage-facts="true"
            data-log-related-trace-stage-facts-layout="shared-stat-strip"
            data-log-related-trace-stage-facts-owner="hertzbeat-ui-stat-strip"
          >
            {stageFacts.map(item => (
              <HzStatCell
                key={`${item.label}:${item.value}`}
                data-log-related-trace-stage-fact-owner="hertzbeat-ui-stat-cell"
                data-log-related-trace-stage-fact-tone={item.tone || 'default'}
                label={item.label}
                value={item.value}
                tone={stageFactTone(item.tone)}
                variant="tile"
                className="min-h-[64px]"
              />
            ))}
          </HzStatStrip>
        ) : null}
        {loading ? (
          <ObservabilityStatusState title={loadingTitle} copy={loadingCopy} />
        ) : error ? (
          <ObservabilityStatusState title={t('log.manage.related-trace.error-title')} copy={error} tone="danger" />
        ) : rows.length > 0 ? (
          <HzDialogBodyLayout
            variant="split-detail"
            data-log-related-trace-body-layout-owner="hertzbeat-ui-dialog-body-layout"
            data-log-related-trace-body-layout="split-detail"
          >
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
            <HzDialogBodyLayout
              variant="side-stack"
              data-log-related-trace-side-stack-owner="hertzbeat-ui-dialog-body-layout"
              data-log-related-trace-side-stack="selected-facts"
            >
              {selectedTraceEvent ? (
                <HzStateNotice
                  data-log-related-trace-event-detail="span-event-detail"
                  data-log-related-trace-event-detail-owner="hertzbeat-ui-state-notice"
                  title={selectedTraceEvent.event.label}
                  description={(
                    <span data-log-related-trace-event-detail-copy="span-event-not-span">
                      {t('log.manage.related-trace.event-detail.copy')}
                    </span>
                  )}
                  meta={(
                    <span data-log-related-trace-event-detail-meta="span-event-label">
                      {t('log.manage.related-trace.event-detail.title')}
                    </span>
                  )}
                  actions={(
                    <HzButton
                      data-log-related-trace-event-detail-action="view-span"
                      data-log-related-trace-event-detail-control="shared-hz-button"
                      intent="ghost"
                      size="xs"
                      onClick={showSelectedSpan}
                    >
                      {t('log.manage.related-trace.event-detail.action.span')}
                    </HzButton>
                  )}
                  tone="info"
                  variant="hint"
                  className="border-x-0 border-b border-t-0 bg-transparent px-0 pb-2 pt-0"
                />
              ) : null}
              <HzDetailRows
                data-log-related-trace-selected-facts="shared-detail-rows"
                data-log-related-trace-selected-facts-owner="hertzbeat-ui-detail-rows"
                rows={activeSelectedFacts.map(row => ({
                  key: `${row.title}-${row.meta ?? ''}`,
                  title: row.title,
                  copy: row.copy,
                  meta: row.meta
                }))}
              />
            </HzDialogBodyLayout>
          </HzDialogBodyLayout>
        ) : (
          <ObservabilityStatusState title={emptyTitle} copy={emptyCopy} />
        )}
      </HzDialogBodyLayout>
    </OverlayDialog>
  );
}
