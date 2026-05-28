'use client';

import React from 'react';
import { CircleAlert, Flag } from 'lucide-react';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';

export type ObservabilityWaterfallRow = {
  key: string;
  title: string;
  subtitle?: string;
  detailLabel?: string;
  durationLabel: string;
  offsetLabel?: string;
  leftPct: number;
  widthPct: number;
  selected?: boolean;
  tone?: 'default' | 'danger';
  depth?: number;
  events?: ObservabilityWaterfallEvent[];
};

export type ObservabilityWaterfallEvent = {
  key: string;
  label: string;
  leftPct: number;
  tone?: 'default' | 'danger';
  offsetLabel?: string;
  attributesLabel?: string;
};

export type ObservabilityWaterfallTick = {
  percent: number;
  label: string;
};

export type ObservabilityWaterfallCopy = {
  overviewTitle?: string;
  spanCount?: (count: number) => string;
  eventCount?: (count: number) => string;
  rowEventCount?: (count: number) => string;
};

type WaterfallLocaleCode = 'en-US' | 'zh-CN';

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

function translateWaterfall(key: string, locale: WaterfallLocaleCode = 'en-US') {
  return (
    SUPPLEMENTAL_MESSAGES[locale]?.[key] ??
    SUPPLEMENTAL_MESSAGES['en-US']?.[key] ??
    SUPPLEMENTAL_MESSAGES['zh-CN']?.[key] ??
    key
  );
}

function interpolateWaterfallCopy(template: string, values: Record<string, string | number>) {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => String(values[key] ?? ''));
}

function resolveWaterfallLocale(spanLabel: string, durationLabel: string, timelineLabel: string): WaterfallLocaleCode {
  const zhMessages = SUPPLEMENTAL_MESSAGES['zh-CN'];
  return spanLabel === zhMessages?.['observability.waterfall.span-label'] ||
    durationLabel === zhMessages?.['observability.waterfall.duration-label'] ||
    timelineLabel === zhMessages?.['observability.waterfall.timeline-label']
    ? 'zh-CN'
    : 'en-US';
}

const timelineMetaGridClass = 'grid grid-cols-[minmax(0,1fr)_88px] gap-3';
const stackedAxisClass = 'relative min-w-0';
const timelineTrackBackgroundImage =
  'repeating-linear-gradient(90deg, rgba(60,70,84,0.24) 0, rgba(60,70,84,0.24) 1px, transparent 1px, transparent calc(12.5% - 1px)), linear-gradient(180deg, rgba(18,19,23,0.96), rgba(22,24,29,0.92))';

function WaterfallEventIcon({ tone }: { tone?: ObservabilityWaterfallEvent['tone'] }) {
  const EventIcon = tone === 'danger' ? CircleAlert : Flag;
  const iconName = tone === 'danger' ? 'circle-alert' : 'flag';

  return (
    <EventIcon
      aria-hidden="true"
      data-waterfall-event-marker-source="lucide"
      data-waterfall-event-marker-icon={iconName}
      size={13}
      strokeWidth={2.2}
      className={tone === 'danger' ? 'text-[#cf6970]' : 'text-[#cfac5c]'}
    />
  );
}

export function ObservabilityWaterfall({
  rows,
  spanLabel = translateWaterfall('observability.waterfall.span-label'),
  durationLabel = translateWaterfall('observability.waterfall.duration-label'),
  timelineLabel = translateWaterfall('observability.waterfall.timeline-label'),
  waterfallCopy,
  timelineTicks = [],
  selectedEventKey = null,
  onSelect,
  onSelectEvent
}: {
  rows: ObservabilityWaterfallRow[];
  spanLabel?: string;
  durationLabel?: string;
  timelineLabel?: string;
  waterfallCopy?: ObservabilityWaterfallCopy;
  timelineTicks?: ObservabilityWaterfallTick[];
  selectedEventKey?: string | null;
  onSelect?: (key: string) => void;
  onSelectEvent?: (eventKey: string, rowKey: string) => void;
}) {
  const totalEvents = rows.reduce((count, row) => count + (row.events?.length || 0), 0);
  const minimapLaneHeight = 22;
  const minimapHeight = Math.max(34, rows.length * minimapLaneHeight + 8);
  const waterfallLocale = resolveWaterfallLocale(spanLabel, durationLabel, timelineLabel);
  const defaultSpanCount = (count: number) =>
    interpolateWaterfallCopy(translateWaterfall('observability.waterfall.span-count', waterfallLocale), { count });
  const defaultEventCount = (count: number) =>
    interpolateWaterfallCopy(translateWaterfall('observability.waterfall.event-count', waterfallLocale), { count });
  const overviewTitle =
    waterfallCopy?.overviewTitle ??
    interpolateWaterfallCopy(translateWaterfall('observability.waterfall.overview-title', waterfallLocale), { timeline: timelineLabel });
  const spanCountLabel = (waterfallCopy?.spanCount ?? defaultSpanCount)(rows.length);
  const eventCountLabel = (waterfallCopy?.eventCount ?? defaultEventCount)(totalEvents);
  const rowEventCount = waterfallCopy?.rowEventCount ?? waterfallCopy?.eventCount ?? defaultEventCount;

  return (
    <div
      data-observability-waterfall="true"
      data-waterfall-density="fine"
      data-waterfall-axis-layout="stacked-full-width"
      className="overflow-hidden rounded-[4px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]"
    >
      <div className={`${timelineMetaGridClass} items-center border-b border-[var(--ops-border-color)] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[var(--ops-text-tertiary)]`}>
        <span>{spanLabel}</span>
        <span>{durationLabel}</span>
      </div>
      <div data-waterfall-minimap="span-event-overview" className="border-b border-[var(--ops-border-color)] bg-[rgba(13,16,21,0.72)] px-3 py-2.5">
        <div data-waterfall-minimap-summary-row="separate-overview-row" className="mb-2 flex min-w-0 items-center justify-between gap-3 text-[11px] text-[var(--ops-text-secondary)]">
          <div data-waterfall-minimap-summary="timeline-context" className="min-w-0">
            <span className="font-semibold text-[var(--ops-text-primary)]">{overviewTitle}</span>
            <span className="ml-3 whitespace-nowrap">
              {spanCountLabel}{totalEvents > 0 ? ` · ${eventCountLabel}` : ''}
            </span>
          </div>
        </div>
        <div
          data-waterfall-minimap-axis="stacked-full-width"
          data-waterfall-coordinate-system="stacked-full-width-axis"
          className={stackedAxisClass}
        >
          <div className="relative mb-1 h-4">
            {timelineTicks.map(tick => (
              <span
                key={`minimap:${tick.percent}:${tick.label}`}
                className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] text-[var(--ops-text-tertiary)]"
                style={{ left: `${clampPercent(tick.percent)}%` }}
              >
                {tick.label}
              </span>
            ))}
          </div>
          <div
            data-waterfall-coordinate-surface="borderless-percent-axis"
            data-waterfall-minimap-lanes="row-order"
            className="relative overflow-hidden rounded-[2px] ring-1 ring-inset ring-[var(--ops-border-color)] bg-[linear-gradient(180deg,rgba(15,18,24,0.96),rgba(11,13,18,0.94))]"
            style={{ height: `${minimapHeight}px` }}
          >
            {rows.map((row, index) => {
              const left = clampPercent(row.leftPct);
              const width = Math.max(Math.min(row.widthPct, 100 - left), 0.5);

              return (
                <div
                  key={`minimap:${row.key}`}
                  data-waterfall-minimap-lane-key={row.key}
                  data-waterfall-minimap-lane-index={index}
                  className="absolute inset-x-0 h-[14px]"
                  style={{ top: `${4 + index * minimapLaneHeight}px` }}
                >
                  <div
                    aria-hidden="true"
                    data-waterfall-minimap-lane-track="true"
                    className="absolute inset-0 rounded-[2px] ring-1 ring-inset ring-[rgba(68,78,94,0.16)]"
                    style={{ backgroundImage: timelineTrackBackgroundImage }}
                  />
                  <span
                    data-waterfall-minimap-bar="true"
                    data-waterfall-minimap-bar-key={row.key}
                    data-waterfall-minimap-bar-visual="shared-span-bar"
                    data-waterfall-minimap-bar-height="matches-row-bar"
                    data-waterfall-bar-left-pct={`${left}`}
                    data-waterfall-bar-width-pct={`${width}`}
                    data-waterfall-bar-tone={row.tone ?? 'default'}
                    aria-hidden="true"
                    className={`absolute top-[3px] bottom-[3px] rounded-[2px] ${
                      row.tone === 'danger'
                        ? 'bg-[linear-gradient(90deg,rgba(197,96,104,0.92),rgba(221,132,132,0.82))]'
                        : 'bg-[linear-gradient(90deg,rgba(112,126,148,0.92),rgba(151,162,180,0.78))]'
                    } ${row.selected ? 'ring-1 ring-[rgba(210,220,235,0.34)]' : ''}`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      minWidth: '2px'
                    }}
                  />
                  {(row.events || []).map(event => (
                    <button
                      type="button"
                      key={`minimap:event:${event.key}`}
                      data-waterfall-minimap-event-marker="true"
                      data-waterfall-event-marker-action={onSelectEvent ? 'select-span-event' : undefined}
                      data-waterfall-event-marker-selected={selectedEventKey === event.key ? 'true' : undefined}
                      aria-label={event.label}
                      aria-pressed={selectedEventKey === event.key ? true : undefined}
                      title={event.label}
                      className={`absolute top-[-5px] flex h-[22px] w-[18px] -translate-x-1/2 items-center justify-center rounded-[3px] p-0 transition-colors hover:bg-[rgba(148,163,184,0.10)] ${
                        selectedEventKey === event.key ? 'bg-[rgba(148,163,184,0.12)] drop-shadow-[0_0_6px_rgba(226,232,240,0.42)]' : ''
                      }`}
                      style={{
                        left: `${clampPercent(event.leftPct)}%`
                      }}
                      onClick={clickEvent => {
                        clickEvent.stopPropagation();
                        onSelectEvent?.(event.key, row.key);
                      }}
                    >
                      <WaterfallEventIcon tone={event.tone} />
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="h-10 border-b border-[var(--ops-border-color)] px-3">
        <div data-waterfall-ruler-axis="stacked-full-width" data-waterfall-coordinate-system="stacked-full-width-axis" className={`${stackedAxisClass} h-full`}>
          <div className="absolute inset-x-0 top-3 h-px bg-gradient-to-r from-transparent via-[rgba(114,123,140,0.24)] to-transparent" />
          {timelineTicks.map(tick => (
            <div
              key={`${tick.percent}:${tick.label}`}
              className="absolute top-1.5 -translate-x-1/2 text-[10px] text-[var(--ops-text-tertiary)]"
              style={{ left: `${clampPercent(tick.percent)}%` }}
            >
              <div className="mx-auto h-3 w-px bg-[rgba(114,123,140,0.3)]" />
              <span className="mt-1 block whitespace-nowrap">{tick.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="divide-y divide-[var(--ops-border-color)]">
        {rows.map(row => {
          const depth = Math.max(row.depth ?? 0, 0);
          const treeDotTone = row.tone === 'danger' ? 'danger' : depth === 0 ? 'root' : 'default';
          const left = clampPercent(row.leftPct);
          const width = Math.max(Math.min(row.widthPct, 100 - left), 0.5);
          const subtitleTokens = row.subtitle
            ?.split('·')
            .map(token => token.trim())
            .filter(token => token.length > 0);

          return (
            <div
              key={row.key}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              data-waterfall-row-layout="fixed-height"
              className={`min-h-[92px] w-full px-3 py-2.5 text-left transition-colors ${
                row.selected ? 'bg-[rgba(88,112,145,.10)] shadow-[inset_2px_0_0_rgba(132,151,176,0.62)]' : 'hover:bg-[var(--ops-surface-raised)]'
              }`}
              data-waterfall-row-tone={row.selected ? 'selected' : undefined}
              onClick={onSelect ? () => onSelect(row.key) : undefined}
              onKeyDown={event => {
                if (!onSelect || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                onSelect(row.key);
              }}
            >
              <div data-waterfall-row-meta="span-and-duration" className={`${timelineMetaGridClass} items-start`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" data-waterfall-indent="true" className="shrink-0" style={{ width: `${depth * 16}px` }} />
                  <span
                    aria-hidden="true"
                    data-waterfall-tree-dot="true"
                    data-waterfall-tree-dot-tone={treeDotTone}
                    className={`h-2.5 w-2.5 shrink-0 rounded-[2px] border ${
                      treeDotTone === 'danger'
                        ? 'border-[#c56a72]/80 bg-[rgba(197,96,104,0.18)]'
                        : treeDotTone === 'root'
                          ? 'border-[#6f7b90]/70 bg-[rgba(120,136,162,0.18)]'
                        : 'border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)]'
                    }`}
                  />
                  <div data-waterfall-name-shell="true" className="grid min-w-0 gap-0.5">
                    <div
                      data-waterfall-title-wrap="anywhere"
                      className="text-sm font-medium leading-[1.35] text-[var(--ops-text-primary)]"
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {row.title}
                    </div>
                    {subtitleTokens && subtitleTokens.length > 0 ? (
                      <div data-waterfall-subtitle-tokens="true" className="flex flex-wrap gap-1.5 text-[11px] text-[var(--ops-text-secondary)]">
                        {subtitleTokens.map(token => (
                          <span key={`${row.key}:${token}`} className="whitespace-nowrap">
                            {token}
                          </span>
                        ))}
                        {row.events?.length ? (
                          <span data-waterfall-event-count="true" className="whitespace-nowrap text-[#cfac5c]">
                            {rowEventCount(row.events.length)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {row.detailLabel ? (
                      <div
                        data-waterfall-detail-wrap="anywhere"
                        className="font-mono text-[10px] text-[var(--ops-text-tertiary)]"
                        style={{ overflowWrap: 'anywhere' }}
                      >
                        {row.detailLabel}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                <div data-waterfall-duration-tone="strong" className="text-[12px] font-semibold text-[var(--ops-text-primary)]">
                  {row.durationLabel}
                </div>
                  {row.offsetLabel ? (
                    <div data-waterfall-offset-tone="subtle" className="mt-1 text-[11px] text-[var(--ops-text-tertiary)]">
                      {row.offsetLabel}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 min-w-0">
                <div
                  data-waterfall-bar-shell="true"
                  data-waterfall-bar-track="striped"
                  data-waterfall-row-axis-layout="stacked-full-width"
                  data-waterfall-coordinate-system="stacked-full-width-axis"
                  data-waterfall-coordinate-surface="borderless-percent-axis"
                  className="relative h-[14px] rounded-[2px] ring-1 ring-inset ring-[rgba(68,78,94,0.16)]"
                  style={{ backgroundImage: timelineTrackBackgroundImage }}
                >
                  <span
                    data-waterfall-start-marker="true"
                    className="absolute top-[1px] bottom-[1px] w-px rounded-full bg-[rgba(114,123,140,0.42)]"
                    style={{ left: `${left}%` }}
                  />
                  <span
                    data-waterfall-row-bar-key={row.key}
                    data-waterfall-row-bar-visual="shared-span-bar"
                    data-waterfall-bar-left-pct={`${left}`}
                    data-waterfall-bar-width-pct={`${width}`}
                    data-waterfall-bar-tone={row.tone ?? 'default'}
                    className={`absolute top-[3px] bottom-[3px] rounded-[2px] ${
                      row.tone === 'danger'
                        ? 'bg-[linear-gradient(90deg,rgba(197,96,104,0.92),rgba(221,132,132,0.82))]'
                        : 'bg-[linear-gradient(90deg,rgba(112,126,148,0.92),rgba(151,162,180,0.78))]'
                    }`}
                    style={{ left: `${left}%`, width: `${width}%`, minWidth: '2px' }}
                  />
                  {(row.events || []).map(event => (
                    <button
                      type="button"
                      key={event.key}
                      data-waterfall-event-marker="true"
                      data-waterfall-event-marker-action={onSelectEvent ? 'select-span-event' : undefined}
                      data-waterfall-event-marker-selected={selectedEventKey === event.key ? 'true' : undefined}
                      aria-label={event.label}
                      aria-pressed={selectedEventKey === event.key ? true : undefined}
                      title={event.label}
                      className={`absolute top-[-5px] flex h-[22px] w-[18px] -translate-x-1/2 items-center justify-center rounded-[3px] p-0 transition-colors hover:bg-[rgba(148,163,184,0.10)] ${
                        selectedEventKey === event.key ? 'bg-[rgba(148,163,184,0.12)] drop-shadow-[0_0_6px_rgba(226,232,240,0.42)]' : ''
                      }`}
                      style={{ left: `${clampPercent(event.leftPct)}%` }}
                      onClick={clickEvent => {
                        clickEvent.stopPropagation();
                        onSelectEvent?.(event.key, row.key);
                      }}
                    >
                      <WaterfallEventIcon tone={event.tone} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
